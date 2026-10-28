import mongoose from 'mongoose'
import Product from '../models/Product.js'
import Bill from '../models/Bill.js'
import Customer from '../models/Customer.js'
import Store from '../models/Store.js'
import { badRequest, conflict, notFound } from '../lib/http-error.js'
import { lineAmount, taxOn, applyRoundOff, toRupees } from '../lib/money.js'
import { parsePagination, parseSort, buildSearch, pageMeta, parseDateRange } from '../lib/query.js'
import { applyStockDelta } from './inventoryService.js'

const SORTABLE = ['billedAt', 'total', 'invoiceNo', 'status']

/** Atomically reserves the next per-store sequence number for a document kind. */
export const nextSequence = async (session, storeId, kind) => {
  const store = await Store.findOneAndUpdate(
    { _id: storeId },
    { $inc: { [`sequences.${kind}`]: 1 } },
    { new: true, session },
  )
  if (!store) throw notFound('Store not found.')
  return store.sequences[kind]
}

export const billService = {
  async list(storeId, query = {}) {
    const { page, limit, skip } = parsePagination(query)
    const sort = parseSort(query, SORTABLE, { billedAt: -1 })
    const filter = { store: storeId }
    if (query.status) filter.status = query.status
    if (query.method) filter.method = query.method
    if (query.customerId) filter.customer = query.customerId
    const { range } = parseDateRange(query, { maxDays: 730 })
    if (range.$gte || range.$lte) filter.billedAt = range
    const search = buildSearch(['invoiceNo', 'customerName', 'cashierName'], query.search)
    if (search) Object.assign(filter, search)

    const [items, total, totals] = await Promise.all([
      Bill.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Bill.countDocuments(filter),
      Bill.aggregate([
        { $match: { store: new mongoose.Types.ObjectId(String(storeId)) } },
        {
          $group: {
            _id: null,
            billed: { $sum: '$total' },
            collected: { $sum: '$amountPaid' },
            refunded: { $sum: { $cond: [{ $eq: ['$status', 'Refunded'] }, '$total', 0] } },
            count: { $sum: 1 },
          },
        },
      ]),
    ])
    const unpaid = await Bill.aggregate([
      { $match: { store: new mongoose.Types.ObjectId(String(storeId)), status: { $in: ['Due', 'Partial'] } } },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: { $subtract: ['$total', '$amountPaid'] } } } },
    ])
    const t = totals[0] || { billed: 0, collected: 0, refunded: 0, count: 0 }
    return {
      items: items.map((b) => new Bill(b).toSafeJSON()),
      meta: pageMeta(total, page, limit),
      summary: {
        billed: toRupees(t.billed),
        collected: toRupees(t.collected),
        refunded: toRupees(t.refunded),
        bills: t.count,
        unpaid: toRupees(unpaid[0]?.amount || 0),
        unpaidCount: unpaid[0]?.count || 0,
      },
    }
  },

  async get(storeId, id) {
    const bill = await Bill.findOne({ _id: id, store: storeId })
    if (!bill) throw notFound('Bill not found.')
    return bill
  },

  async getByInvoiceNo(storeId, invoiceNo) {
    const bill = await Bill.findOne({ store: storeId, invoiceNo: String(invoiceNo).toUpperCase() })
    if (!bill) throw notFound('Bill not found.')
    return bill
  },

  /**
   * Creates a bill end to end:
   *  1. prices, discounts and tax are computed from catalogue data, never from
   *     the client-submitted amounts;
   *  2. stock is decremented with a guarded update so a concurrent sale can
   *     never oversell;
   *  3. the invoice number is reserved from a per-store counter inside the
   *     same transaction, so numbers are unique and never reused.
   * Credit bills stay `Due` and land on the customer's balance.
   */
  async create(storeId, payload, actor) {
    const requested = (payload.lines || []).filter((l) => Number(l.qty) > 0)
    if (!requested.length) throw badRequest('Add at least one product to the bill.')

    const ids = [...new Set(requested.map((l) => String(l.productId)))]
    const products = await Product.find({ _id: { $in: ids }, store: storeId, archived: false }).lean()
    const byId = new Map(products.map((p) => [String(p._id), p]))
    for (const id of ids) {
      if (!byId.has(id)) throw badRequest('A product on this bill is not in your catalogue.')
    }

    let customer = null
    if (payload.customerId) {
      customer = await Customer.findOne({ _id: payload.customerId, store: storeId }).lean()
      if (!customer) throw badRequest('Choose a customer from this store.')
    }
    const method = payload.method || 'Cash'
    const isCredit = method === 'Credit'
    if (isCredit && !customer) throw badRequest('Choose a customer before billing on credit.')

    const session = await mongoose.startSession()
    try {
      let bill
      await session.withTransaction(async () => {
        const store = await Store.findById(storeId).session(session)
        if (!store) throw notFound('Store not found.')

        let subtotal = 0
        let discountTotal = 0
        let taxTotal = 0
        const lines = []

        for (const line of requested) {
          const product = byId.get(String(line.productId))
          const qty = Number(line.qty)
          if (!Number.isInteger(qty) || qty <= 0) throw badRequest('Quantities must be whole numbers above zero.')
          if (payload.allowNegativeStock !== true && product.stock < qty)
            throw badRequest(`Only ${product.stock} ${product.unit} of ${product.name} on the shelf.`)

          const discountPercent = Math.min(100, Math.max(0, Number(line.discountPercent ?? 0)))
          const { gross, discount, amount } = lineAmount(product.sellingPrice, qty, discountPercent)
          const taxAmount = taxOn(amount, product.gstRate)
          subtotal += gross
          discountTotal += discount
          taxTotal += taxAmount
          lines.push({
            product: product._id,
            name: product.name,
            sku: product.sku,
            hsn: product.hsn,
            unit: product.unit,
            qty,
            rate: product.sellingPrice,
            discountPercent,
            discountAmount: discount,
            gstRate: product.gstRate,
            taxAmount,
            amount,
          })
        }

        // Gross less line discounts, plus tax on the discounted amounts.
        const payable = subtotal - discountTotal + taxTotal
        const { roundOff, total } = applyRoundOff(payable, store.preferences?.roundTotals !== false)
        const prefix = (store.invoiceSettings?.prefix || 'GRV').toUpperCase()
        const seq = await nextSequence(session, storeId, 'bill')
        const amountPaid = isCredit ? 0 : total
        const status = isCredit ? 'Due' : 'Paid'

        const [created] = await Bill.create(
          [
            {
              store: storeId,
              invoiceNo: `${prefix}-${seq}`,
              customer: customer?._id ?? null,
              customerName: customer?.name || 'Walk-in',
              lines,
              subtotal,
              discountTotal,
              taxTotal,
              roundOff,
              total,
              amountPaid,
              method,
              status,
              note: String(payload.note || ''),
              createdBy: actor?.id ?? null,
              cashierName: actor?.name || '',
              billedAt: payload.billedAt ? new Date(payload.billedAt) : new Date(),
            },
          ],
          { session },
        )
        bill = created

        // Decrement stock only after the bill record itself is accepted.
        for (const line of lines) {
          const product = byId.get(String(line.product))
          const doc = await Product.findOne({ _id: product._id, store: storeId }).session(session)
          if (!doc) throw badRequest(`A product on this bill no longer exists.`)
          await applyStockDelta({
            storeId,
            product: doc,
            delta: -line.qty,
            reason: 'Other',
            note: `Sold on ${bill.invoiceNo}`,
            source: 'bill',
            sourceId: bill.invoiceNo,
            actor,
            session,
          })
        }
      })
      return { ...bill.toSafeJSON(), customerId: customer?._id ? String(customer._id) : null }
    } finally {
      await session.endSession()
    }
  },

  /** Cancels a bill: restores stock, reverses collected money, keeps audit. */
  async cancel(storeId, id, payload, actor) {
    const bill = await this.get(storeId, id)
    if (bill.status === 'Cancelled') throw badRequest('This bill is already cancelled.')
    const hasReturns = bill.lines.some((l) => l.returnedQty > 0)
    const reason = String(payload?.reason || '').trim()
    if (!reason) throw badRequest('Give a reason for cancelling this bill.')

    const session = await mongoose.startSession()
    try {
      let updated
      await session.withTransaction(async () => {
        const fresh = await Bill.findOne({ _id: bill._id, store: storeId }).session(session)
        if (!fresh || fresh.status === 'Cancelled') throw badRequest('This bill is already cancelled.')

        if (!hasReturns) {
          for (const line of fresh.lines) {
            const product = await Product.findOne({ _id: line.product, store: storeId }).session(session)
            if (!product) throw badRequest(`A product on this bill no longer exists.`)
            await applyStockDelta({
              storeId,
              product,
              delta: line.qty,
              reason: 'Other',
              note: `Restocked from cancelled ${fresh.invoiceNo}`,
              source: 'bill-cancel',
            sourceId: fresh.invoiceNo,
            actor,
            session,
            })
          }
        }
        fresh.status = 'Cancelled'
        fresh.cancelledAt = new Date()
        fresh.cancelReason = reason
        await fresh.save({ session })
        updated = fresh
      })
      return updated
    } finally {
      await session.endSession()
    }
  },

  async updateNote(storeId, id, payload) {
    const bill = await this.get(storeId, id)
    bill.note = String(payload.note ?? bill.note).slice(0, 400)
    await bill.save()
    return bill
  },
}

export const outstandingOf = (bill) => bill.total - bill.amountPaid
export const dueRupees = (bill) => toRupees(outstandingOf(bill))

export default billService
