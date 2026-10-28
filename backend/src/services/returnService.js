import mongoose from 'mongoose'
import { toRupees } from '../lib/money.js'
import Return from '../models/Return.js'
import Bill from '../models/Bill.js'
import Customer from '../models/Customer.js'
import Product from '../models/Product.js'
import { badRequest, notFound } from '../lib/http-error.js'
import { parsePagination, parseSort, pageMeta, parseDateRange } from '../lib/query.js'
import { nextSequence } from './billService.js'
import { applyStockDelta } from './inventoryService.js'

const SORTABLE = ['returnedAt', 'refundTotal', 'returnNo']
export { RETURN_REASONS, RETURN_RESOLUTIONS } from '../models/Return.js'

export const returnService = {
  async list(storeId, query = {}) {
    const { page, limit, skip } = parsePagination(query)
    const sort = parseSort(query, SORTABLE, { returnedAt: -1 })
    const filter = { store: storeId }
    if (query.billId) filter.bill = query.billId
    const { range } = parseDateRange(query, { maxDays: 730 })
    if (range.$gte || range.$lte) filter.returnedAt = range
    const [items, total] = await Promise.all([
      Return.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Return.countDocuments(filter),
    ])
    const refunded = items.reduce((sum, r) => sum + r.refundTotal, 0)
    return {
      items: items.map((r) => new Return(r).toSafeJSON()),
      meta: pageMeta(total, page, limit),
      summary: { refunded: toRupees(refunded), returns: total },
    }
  },

  async get(storeId, id) {
    const doc = await Return.findOne({ _id: id, store: storeId })
    if (!doc) throw notFound('Return not found.')
    return doc
  },

  /**
   * Bills that can still have items returned, with the remaining eligible
   * quantity per line (sold minus already returned).
   */
  async eligible(storeId, query = {}) {
    const { page, limit, skip } = parsePagination(query, { defaultLimit: 20 })
    const filter = { store: storeId, status: { $nin: ['Cancelled'] } }
    const search = String(query.search || '').trim()
    if (search) {
      const rx = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.$or = [{ invoiceNo: { $options: 'i', $regex: rx } }, { customerName: { $options: 'i', $regex: rx } }]
    }
    const [bills, total] = await Promise.all([
      Bill.find(filter).sort({ billedAt: -1 }).skip(skip).limit(limit).lean(),
      Bill.countDocuments(filter),
    ])
    const items = bills
      .map((bill) => {
        const lines = bill.lines
          .map((line) => ({
            productId: String(line.product),
            name: line.name,
            sku: line.sku,
            unit: line.unit,
            soldQty: line.qty,
            returnedQty: line.returnedQty,
            returnableQty: Math.max(0, line.qty - line.returnedQty),
            rate: line.rate,
            gstRate: line.gstRate,
            taxAmount: line.taxAmount,
          }))
          .filter((line) => line.returnableQty > 0)
        return { bill: new Bill(bill).toSafeJSON(), lines }
      })
      .filter((entry) => entry.lines.length > 0)
    return { items, meta: pageMeta(total, page, limit) }
  },

  async create(storeId, payload, actor) {
    const bill = await Bill.findOne({ _id: payload.billId, store: storeId }).lean()
    if (!bill) throw notFound('Bill not found.')
    if (bill.status === 'Cancelled') throw badRequest('A cancelled bill cannot be returned against.')
    if (!bill.lines?.length) throw badRequest('This bill has no item details to return.')

    const requested = (payload.lines || []).filter((l) => Number(l.qty) > 0)
    if (!requested.length) throw badRequest('Choose at least one item to return.')
    if (!payload.reason) throw badRequest('Choose a reason for the return.')

    const session = await mongoose.startSession()
    try {
      let created
      await session.withTransaction(async () => {
        const fresh = await Bill.findOne({ _id: bill._id, store: storeId }).session(session)
        if (!fresh || fresh.status === 'Cancelled') throw badRequest('This bill can no longer be returned against.')

        let refundTotal = 0
        const lines = []
        for (const request of requested) {
          const line = fresh.lines.find((l) => String(l.product) === String(request.productId))
          if (!line) throw badRequest('That item is not on this bill.')
          const qty = Number(request.qty)
          const remaining = line.qty - line.returnedQty
          if (!Number.isInteger(qty) || qty <= 0) throw badRequest('Quantities must be whole numbers above zero.')
          if (qty > remaining) throw badRequest(`Only ${remaining} of ${line.name} can still be returned.`)

          const taxAmount = Math.round((line.taxAmount * qty) / line.qty)
          const amount = line.rate * qty - Math.round((line.discountAmount * qty) / line.qty) + taxAmount
          refundTotal += amount
          lines.push({
            product: line.product,
            name: line.name,
            qty,
            rate: line.rate,
            gstRate: line.gstRate,
            taxAmount,
            amount,
          })
        }

        const resolution = payload.resolution || 'Refund'
        const restock = payload.restocked !== false

        if (restock) {
          for (const line of lines) {
            const doc = await Product.findOne({ _id: line.product, store: storeId }).session(session)
            if (!doc) throw badRequest(`A product on this return no longer exists.`)
            await applyStockDelta({
              storeId,
              product: doc,
              delta: line.qty,
              reason: 'Other',
              note: `Returned on ${fresh.invoiceNo}`,
              source: 'return',
            sourceId: fresh.invoiceNo,
            actor,
            session,
            })
          }
        }

        const seq = await nextSequence(session, storeId, 'return')
        const [doc] = await Return.create(
          [
            {
              store: storeId,
              returnNo: `RET-${String(seq).padStart(4, '0')}`,
              bill: fresh._id,
              billInvoiceNo: fresh.invoiceNo,
              customer: fresh.customer ?? null,
              customerName: fresh.customerName,
              lines,
              refundTotal,
              reason: payload.reason,
              resolution,
              restocked: restock,
              note: String(payload.note || ''),
              createdBy: actor?.id ?? null,
              cashierName: actor?.name || '',
            },
          ],
          { session },
        )
        created = doc

        // Bookkeeping on the original bill — never a rewrite of what was sold.
        for (const line of lines) {
          const target = fresh.lines.find((l) => String(l.product) === String(line.product))
          target.returnedQty += line.qty
        }
        fresh.status = 'Refunded'
        await fresh.save({ session })
      })
      return created
    } finally {
      await session.endSession()
    }
  },
}

export default returnService
