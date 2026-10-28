import mongoose from 'mongoose'
import Payment from '../models/Payment.js'
import Bill from '../models/Bill.js'
import Purchase from '../models/Purchase.js'
import Customer from '../models/Customer.js'
import Supplier from '../models/Supplier.js'
import Return from '../models/Return.js'
import { badRequest, notFound } from '../lib/http-error.js'
import { toRupees } from '../lib/money.js'
import { parsePagination, parseSort, pageMeta, parseDateRange } from '../lib/query.js'

const SORTABLE = ['paidAt', 'amount']

export const PAYMENT_METHOD_OPTIONS = ['Cash', 'UPI', 'Card', 'Bank transfer', 'Credit adjustment']

/**
 * Records a settled money movement and keeps the linked bill/purchase totals
 * consistent. There is deliberately no "pending gateway" state: a payment only
 * exists once the store has actually been paid.
 */
export const recordPayment = async (storeId, payload, actor) => {
  const { direction = 'in', amount, method = 'Cash', reference = '', note = '', paidAt } = payload
  if (!Number.isInteger(amount) || amount <= 0) throw badRequest('Enter an amount above ₹0.')

  const bill = payload.billId ? await Bill.findOne({ _id: payload.billId, store: storeId }) : null
  if (payload.billId && !bill) throw notFound('Bill not found.')
  const purchase = payload.purchaseId ? await Purchase.findOne({ _id: payload.purchaseId, store: storeId }) : null
  if (payload.purchaseId && !purchase) throw notFound('Purchase order not found.')
  const customer = payload.customerId ? await Customer.findOne({ _id: payload.customerId, store: storeId }) : null
  if (payload.customerId && !customer) throw notFound('Customer not found.')
  const supplier = payload.supplierId ? await Supplier.findOne({ _id: payload.supplierId, store: storeId }) : null
  if (payload.supplierId && !supplier) throw notFound('Supplier not found.')

  if (!bill && !purchase && !customer && !supplier) throw badRequest('Choose what this payment belongs to.')

  const session = await mongoose.startSession()
  try {
    let created
    await session.withTransaction(async () => {
      if (bill) {
        const fresh = await Bill.findOne({ _id: bill._id, store: storeId }).session(session)
        if (!fresh) throw notFound('Bill not found.')
        if (fresh.status === 'Cancelled') throw badRequest('This bill was cancelled.')
        const outstanding = fresh.total - fresh.amountPaid
        if (amount > outstanding) throw badRequest(`Only ${toRupees(outstanding)} is outstanding on ${fresh.invoiceNo}.`)
      }
      if (purchase) {
        const fresh = await Purchase.findOne({ _id: purchase._id, store: storeId }).session(session)
        if (!fresh) throw notFound('Purchase order not found.')
        if (fresh.status === 'Cancelled') throw badRequest('This order was cancelled.')
        const outstanding = fresh.total - fresh.amountPaid
        if (amount > outstanding) throw badRequest(`Only ${toRupees(outstanding)} is outstanding on ${fresh.orderNo}.`)
      }
      const [doc] = await Payment.create(
        [
          {
            store: storeId,
            direction,
            amount,
            method,
            bill: bill?._id ?? null,
            billInvoiceNo: bill?.invoiceNo ?? '',
            purchase: purchase?._id ?? null,
            purchaseOrderNo: purchase?.orderNo ?? '',
            customer: customer?._id ?? (bill?.customer ?? null),
            customerName: customer?.name ?? bill?.customerName ?? '',
            supplier: supplier?._id ?? (purchase?.supplier ?? null),
            supplierName: supplier?.name ?? purchase?.supplierName ?? '',
            reference: String(reference),
            note: String(note),
            paidAt: paidAt ? new Date(paidAt) : new Date(),
            createdBy: actor?.id ?? null,
          },
        ],
        { session },
      )
      created = doc

      if (bill) {
        const fresh = await Bill.findOne({ _id: bill._id, store: storeId }).session(session)
        fresh.amountPaid += amount
        fresh.status =
          fresh.amountPaid >= fresh.total ? 'Paid' : fresh.amountPaid > 0 ? 'Partial' : fresh.status === 'Paid' ? 'Due' : fresh.status
        if (fresh.status === 'Partial' || fresh.status === 'Paid') fresh.cancelledAt = null
        await fresh.save({ session })
      }
      if (purchase) {
        const fresh = await Purchase.findOne({ _id: purchase._id, store: storeId }).session(session)
        fresh.amountPaid += amount
        await fresh.save({ session })
      }
    })
    return created
  } finally {
    await session.endSession()
  }
}

export const paymentService = {
  async list(storeId, query = {}) {
    const { page, limit, skip } = parsePagination(query)
    const sort = parseSort(query, SORTABLE, { paidAt: -1 })
    const filter = { store: storeId }
    if (query.direction) filter.direction = query.direction
    if (query.method) filter.method = query.method
    if (query.customerId) filter.customer = query.customerId
    if (query.supplierId) filter.supplier = query.supplierId
    if (query.billId) filter.bill = query.billId
    const { range } = parseDateRange(query, { maxDays: 730 })
    if (range.$gte || range.$lte) filter.paidAt = range

    const [items, total, collected] = await Promise.all([
      Payment.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Payment.countDocuments(filter),
      Payment.aggregate([
        { $match: { store: filter.store, direction: 'in', ...(filter.paidAt ? { paidAt: filter.paidAt } : {}) } },
        { $group: { _id: '$method', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { amount: -1 } },
      ]),
    ])
    const totalCollected = collected.reduce((sum, m) => sum + m.amount, 0)
    return {
      items: items.map((p) => new Payment(p).toSafeJSON()),
      meta: pageMeta(total, page, limit),
      summary: {
        collected: toRupees(totalCollected),
        byMethod: collected.map((m) => ({ method: m._id, amount: toRupees(m.amount), bills: m.count })),
      },
    }
  },

  async record(storeId, payload, actor) {
    if (payload.direction === 'out') {
      if (!payload.purchaseId && !payload.supplierId) throw badRequest('Choose the purchase or supplier this pays.')
    }
    return recordPayment(storeId, payload, actor)
  },

  /** Customer ledger: bills, returns and payments that settle the balance. */
  async customerLedger(storeId, customerId) {
    const customer = await Customer.findOne({ _id: customerId, store: storeId }).lean()
    if (!customer) throw notFound('Customer not found.')
    const [bills, returns, payments] = await Promise.all([
      Bill.find({ store: storeId, customer: customer._id }).sort({ billedAt: -1 }).lean(),
      Payment.find({ store: storeId, direction: 'in', customer: customer._id }).sort({ paidAt: -1 }).lean(),
      Return.find({ store: storeId, customer: customer._id }).sort({ returnedAt: -1 }).lean(),
    ])
    const billed = bills.reduce((sum, b) => sum + b.total, 0)
    const paid = payments.reduce((sum, p) => sum + p.amount, 0)
    const returned = returns.reduce((sum, r) => sum + r.refundTotal, 0)
    const due = Math.max(0, customer.openingDue + billed - paid - returned)
    return {
      customer: new Customer(customer).toSafeJSON(),
      bills: bills.map((b) => new Bill(b).toSafeJSON()),
      payments: payments.map((p) => new Payment(p).toSafeJSON()),
      returns: returns.map((r) => new Return(r).toSafeJSON()),
      summary: {
        billed: toRupees(billed),
        paid: toRupees(paid),
        returned: toRupees(returned),
        due: toRupees(due),
      },
    }
  },
}

export default paymentService
