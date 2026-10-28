import mongoose from 'mongoose'
import Product from '../models/Product.js'
import Purchase from '../models/Purchase.js'
import { PURCHASE_STATUSES } from '../models/Purchase.js'
import Supplier from '../models/Supplier.js'
import Store from '../models/Store.js'
import { badRequest, conflict, notFound } from '../lib/http-error.js'
import { lineAmount, taxOn, toRupees } from '../lib/money.js'
import { parsePagination, parseSort, pageMeta } from '../lib/query.js'
import { applyStockDelta } from './inventoryService.js'
import { recordPayment } from './paymentService.js'

const SORTABLE = ['orderedAt', 'total', 'status', 'orderNo']

/** Statuses that still count as "on the way" — not received, not cancelled. */
const OPEN_STATUSES = ['Ordered', 'In transit']

/**
 * Statuses accepted by the list query. "Open" is a virtual filter spanning
 * every order that is still on the way, so the UI's Open tab matches the
 * openValue/openCount summary rather than a single stored status.
 */
export const PURCHASE_LIST_STATUSES = [...PURCHASE_STATUSES, 'Open']

/** Atomically reserves the next per-store sequence number for a document kind. */
const nextSequence = async (session, storeId, kind) => {
  const store = await Store.findOneAndUpdate(
    { _id: storeId },
    { $inc: { [`sequences.${kind}`]: 1 } },
    { new: true, session },
  )
  if (!store) throw notFound('Store not found.')
  return store.sequences[kind]
}

const pad = (n) => String(n).padStart(4, '0')

export const purchaseService = {
  async list(storeId, query = {}) {
    const { page, limit, skip } = parsePagination(query)
    const sort = parseSort(query, SORTABLE, { orderedAt: -1 })
    const filter = { store: storeId }
    if (query.status === 'Open') filter.status = { $in: OPEN_STATUSES }
    else if (query.status) filter.status = query.status
    if (query.supplierId) filter.supplier = query.supplierId
    const [items, total, grouped] = await Promise.all([
      Purchase.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Purchase.countDocuments(filter),
      Purchase.aggregate([
        { $match: { store: new mongoose.Types.ObjectId(String(storeId)) } },
        { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$total' } } },
      ]),
    ])
    const byStatus = grouped.reduce((acc, g) => ({ ...acc, [g._id]: { count: g.count, value: g.value } }), {})
    const openValue = OPEN_STATUSES.reduce((sum, s) => sum + (byStatus[s]?.value || 0), 0)
    const openCount = OPEN_STATUSES.reduce((sum, s) => sum + (byStatus[s]?.count || 0), 0)
    const receivedValue = byStatus['Goods received']?.value || 0
    return {
      items: items.map((p) => new Purchase(p).toSafeJSON()),
      meta: pageMeta(total, page, limit),
      summary: {
        openValue: toRupees(openValue),
        openCount,
        receivedValue: toRupees(receivedValue),
        byStatus: Object.fromEntries(
          Object.entries(byStatus).map(([k, v]) => [k, { count: v.count, value: toRupees(v.value) }]),
        ),
      },
    }
  },

  async get(storeId, id) {
    const purchase = await Purchase.findOne({ _id: id, store: storeId })
    if (!purchase) throw notFound('Purchase order not found.')
    return purchase
  },

  async create(storeId, payload, actor) {
    const supplier = await Supplier.findOne({ _id: payload.supplierId, store: storeId }).lean()
    if (!supplier) throw badRequest('Choose a supplier from this store.')

    const requested = (payload.lines || []).filter((l) => Number(l.qty) > 0)
    if (!requested.length) throw badRequest('Add at least one product with a quantity.')

    const ids = [...new Set(requested.map((l) => String(l.productId)))]
    const products = await Product.find({ _id: { $in: ids }, store: storeId }).lean()
    const byId = new Map(products.map((p) => [String(p._id), p]))
    for (const id of ids) if (!byId.has(id)) throw badRequest('Every line must be a product from this store.')

    let subtotal = 0
    let taxTotal = 0
    const lines = requested.map((l) => {
      const product = byId.get(String(l.productId))
      const qty = Number(l.qty)
      if (!Number.isInteger(qty) || qty <= 0) throw badRequest('Quantities must be whole numbers above zero.')
      const cost = Number(l.cost ?? product.purchasePrice ?? 0)
      if (!(cost >= 0)) throw badRequest('Cost cannot be negative.')
      const { amount } = lineAmount(cost, qty, 0)
      const gstRate = l.gstRate ?? product.gstRate ?? 0
      const taxAmount = taxOn(amount, gstRate)
      subtotal += amount
      taxTotal += taxAmount
      return {
        product: product._id,
        name: product.name,
        sku: product.sku,
        qty,
        cost,
        gstRate,
        taxAmount,
        amount,
      }
    })

    const session = await mongoose.startSession()
    try {
      let created
      await session.withTransaction(async () => {
        const seq = await nextSequence(session, storeId, 'purchase')
        const [purchase] = await Purchase.create(
          [
            {
              store: storeId,
              orderNo: `PO-${pad(seq)}`,
              supplier: supplier._id,
              supplierName: supplier.name,
              supplierInvoiceNo: String(payload.supplierInvoiceNo || ''),
              lines,
              subtotal,
              taxTotal,
              total: subtotal + taxTotal,
              status: payload.status || 'Ordered',
              note: String(payload.note || ''),
              expectedAt: payload.expectedAt ? new Date(payload.expectedAt) : null,
              createdBy: actor?.id ?? null,
            },
          ],
          { session },
        )
        created = purchase
      })
      return created
    } finally {
      await session.endSession()
    }
  },

  /**
   * Receiving stock is a separate, explicit action. Each line is received at
   * most once up to its ordered quantity, and the product's cost price is
   * updated to the latest purchase price.
   */
  async receive(storeId, id, payload, actor) {
    const purchase = await this.get(storeId, id)
    if (purchase.status === 'Cancelled') throw badRequest('This order was cancelled. Raise a new one instead.')
    if (purchase.status === 'Goods received') throw badRequest('Stock from this order has already been received.')

    const requested = payload?.lines?.length
      ? payload.lines.filter((l) => Number(l.qty) > 0)
      : purchase.lines.map((l) => ({ productId: String(l.product), qty: l.qty - l.receivedQty }))
    if (!requested.length) throw badRequest('Nothing left to receive on this order.')

    const session = await mongoose.startSession()
    try {
      let updated
      await session.withTransaction(async () => {
        const fresh = await Purchase.findOne({ _id: purchase._id, store: storeId }).session(session)
        if (!fresh) throw notFound('Purchase order not found.')
        if (fresh.status === 'Cancelled' || fresh.status === 'Goods received')
          throw badRequest('This order has already been received or cancelled.')

        let fullyReceived = true
        for (const line of fresh.lines) {
          const request = requested.find((r) => String(r.productId) === String(line.product))
          if (!request) {
            if (line.receivedQty < line.qty) fullyReceived = false
            continue
          }
          const qty = Number(request.qty)
          const remaining = line.qty - line.receivedQty
          if (qty > remaining) throw badRequest(`You can only receive ${remaining} more of ${line.name}.`)
          if (qty <= 0) continue

          const product = await Product.findOne({ _id: line.product, store: storeId }).session(session)
          if (!product) throw badRequest(`A product on this order no longer exists.`)
          await applyStockDelta({
            storeId,
            product,
            delta: qty,
            reason: 'Other',
            note: `Received against ${fresh.orderNo}`,
            source: 'purchase',
            sourceId: fresh.orderNo,
            actor,
            session,
          })
          if (line.cost > 0) await Product.updateOne({ _id: product._id }, { $set: { purchasePrice: line.cost } }).session(session)
          line.receivedQty += qty
          if (line.receivedQty < line.qty) fullyReceived = false
        }
        fresh.status = fullyReceived ? 'Goods received' : 'In transit'
        if (fullyReceived) fresh.receivedAt = new Date()
        await fresh.save({ session })
        updated = fresh
      })
      return updated
    } finally {
      await session.endSession()
    }
  },

  async pay(storeId, id, payload, actor) {
    const purchase = await this.get(storeId, id)
    const amount = Number(payload.amount)
    const outstanding = purchase.total - purchase.amountPaid
    if (!(amount > 0)) throw badRequest('Enter an amount above ₹0.')
    if (amount > outstanding) throw badRequest(`Only ${toRupees(outstanding)} is outstanding on this order.`)
    return recordPayment(storeId, { direction: 'out', amount, method: payload.method, purchase }, actor)
  },

  async cancel(storeId, id, payload, actor) {
    const purchase = await this.get(storeId, id)
    if (purchase.status === 'Goods received') throw badRequest('Received stock cannot be cancelled — use a return instead.')
    if (purchase.status === 'Cancelled') throw badRequest('This order is already cancelled.')
    purchase.status = 'Cancelled'
    purchase.cancelledAt = new Date()
    purchase.cancelReason = String(payload?.reason || '')
    await purchase.save()
    return purchase
  },

  async update(storeId, id, payload) {
    const purchase = await this.get(storeId, id)
    if (purchase.status === 'Goods received') throw badRequest('Received orders cannot be edited.')
    for (const key of ['supplierInvoiceNo', 'note']) {
      if (payload[key] !== undefined) purchase[key] = String(payload[key])
    }
    if (payload.expectedAt !== undefined) purchase.expectedAt = payload.expectedAt ? new Date(payload.expectedAt) : null
    if (payload.status !== undefined) purchase.status = payload.status
    await purchase.save()
    return purchase
  },
}

export default purchaseService
