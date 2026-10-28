import mongoose from 'mongoose'
import { toRupees } from '../lib/money.js'
import Customer from '../models/Customer.js'
import Bill from '../models/Bill.js'
import Payment from '../models/Payment.js'
import Return from '../models/Return.js'
import { badRequest, notFound } from '../lib/http-error.js'
import { rethrowDuplicate } from '../lib/records.js'
import { parsePagination, parseSort, buildSearch, pageMeta } from '../lib/query.js'

const SORTABLE = ['name', 'createdAt', 'updatedAt']
const PHONE_RE = /^[+\d][\d\s-]{5,19}$/

const assertValid = (payload, { partial = false } = {}) => {
  const name = String(payload.name ?? '').trim()
  if (!partial || payload.name !== undefined) {
    if (name.length < 2) throw badRequest('Give the customer a name.')
  }
  const phone = String(payload.phone ?? '').trim()
  if (phone && !PHONE_RE.test(phone)) throw badRequest('Enter a valid phone number.')
  const email = String(payload.email ?? '').trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('Enter a valid email address.')
  if (payload.openingDue !== undefined && payload.openingDue < 0) throw badRequest('Opening balance cannot be negative.')
  if (payload.creditLimit !== undefined && payload.creditLimit < 0) throw badRequest('Credit limit cannot be negative.')
}

/** Purchase summaries derived from real bills, returns and payments. */
const enrich = async (storeId, customers) => {
  if (!customers.length) return []
  const ids = customers.map((c) => c._id)
  const [bills, payments, returns] = await Promise.all([
    Bill.aggregate([
      { $match: { store: mongoose.Types.ObjectId(String(storeId)), customer: { $in: ids } } },
      {
        $group: {
          _id: '$customer',
          spend: { $sum: '$total' },
          bills: { $sum: 1 },
          units: { $sum: { $sum: '$lines.qty' } },
          last: { $max: '$billedAt' },
        },
      },
    ]),
    Payment.aggregate([
      { $match: { store: mongoose.Types.ObjectId(String(storeId)), direction: 'in', customer: { $in: ids } } },
      { $group: { _id: '$customer', paid: { $sum: '$amount' } } },
    ]),
    Return.aggregate([
      { $match: { store: mongoose.Types.ObjectId(String(storeId)), customer: { $in: ids } } },
      { $group: { _id: '$customer', refunded: { $sum: '$refundTotal' } } },
    ]),
  ])
  const byId = (arr) => new Map(arr.map((r) => [String(r._id), r]))
  const b = byId(bills)
  const p = byId(payments)
  const r = byId(returns)
  return customers.map((c) => {
    const base = new Customer(c).toSafeJSON()
    const spend = b.get(String(c._id))?.spend || 0
    const paid = p.get(String(c._id))?.paid || 0
    const refunded = r.get(String(c._id))?.refunded || 0
    return {
      ...base,
      stats: {
        visits: b.get(String(c._id))?.bills || 0,
        units: b.get(String(c._id))?.units || 0,
        spend: toRupees(spend),
        paid: toRupees(paid),
        refunded: toRupees(refunded),
        due: toRupees(Math.max(0, (c.openingDue || 0) + spend - paid - refunded)),
        lastVisit: b.get(String(c._id))?.last || null,
      },
    }
  })
}

export const customerService = {
  async list(storeId, query = {}) {
    const { page, limit, skip } = parsePagination(query)
    const sort = parseSort(query, SORTABLE, { name: 1 })
    const filter = { store: storeId }
    if (query.archived !== 'true') filter.archived = false
    if (query.withDues === 'true') filter.openingDue = { $gt: 0 }
    const search = buildSearch(['name', 'phone', 'email', 'address', 'gstin'], query.search)
    if (search) Object.assign(filter, search)
    const [docs, total] = await Promise.all([
      Customer.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Customer.countDocuments(filter),
    ])
    return { items: await enrich(storeId, docs), meta: pageMeta(total, page, limit) }
  },

  async get(storeId, id) {
    const customer = await Customer.findOne({ _id: id, store: storeId }).lean()
    if (!customer) throw notFound('Customer not found.')
    const [enriched] = await enrich(storeId, [customer])
    return enriched
  },

  async create(storeId, payload) {
    assertValid(payload)
    try {
      return await Customer.create({
        store: storeId,
        name: String(payload.name).trim(),
        phone: String(payload.phone ?? '').trim(),
        email: String(payload.email ?? '').trim().toLowerCase(),
        address: String(payload.address ?? '').trim(),
        gstin: String(payload.gstin ?? '').trim().toUpperCase(),
        openingDue: payload.openingDue ?? 0,
        creditLimit: payload.creditLimit ?? 0,
        tag: payload.tag || 'New',
        note: String(payload.note ?? '').trim(),
      })
    } catch (err) {
      rethrowDuplicate(err, 'A customer with that name already exists.')
    }
  },

  async update(storeId, id, payload) {
    const customer = await Customer.findOne({ _id: id, store: storeId })
    if (!customer) throw notFound('Customer not found.')
    assertValid(payload, { partial: true })
    for (const key of ['phone', 'email', 'address', 'gstin', 'tag', 'note']) {
      if (payload[key] !== undefined) customer[key] = String(payload[key]).trim()
    }
    if (payload.name !== undefined) customer.name = String(payload.name).trim()
    if (payload.openingDue !== undefined) customer.openingDue = payload.openingDue
    if (payload.creditLimit !== undefined) customer.creditLimit = payload.creditLimit
    if (payload.archived !== undefined) customer.archived = Boolean(payload.archived)
    try {
      await customer.save()
      return customer
    } catch (err) {
      rethrowDuplicate(err, 'A customer with that name already exists.')
    }
  },

  /** Archive keeps bill history readable; a customer on a bill is never deleted. */
  async remove(storeId, id) {
    const customer = await Customer.findOne({ _id: id, store: storeId })
    if (!customer) throw notFound('Customer not found.')
    const used = await Bill.exists({ store: storeId, customer: customer._id })
    if (used) {
      customer.archived = true
      await customer.save()
      return { archived: true }
    }
    await customer.deleteOne()
    return { deleted: true }
  },

  async history(storeId, id) {
    const customer = await Customer.findOne({ _id: id, store: storeId }).lean()
    if (!customer) throw notFound('Customer not found.')
    const [bills, payments, returns] = await Promise.all([
      Bill.find({ store: storeId, customer: customer._id }).sort({ billedAt: -1 }).limit(50).lean(),
      Payment.find({ store: storeId, direction: 'in', customer: customer._id }).sort({ paidAt: -1 }).limit(50).lean(),
      Return.find({ store: storeId, customer: customer._id }).sort({ returnedAt: -1 }).limit(50).lean(),
    ])
    const [enriched] = await enrich(storeId, [customer])
    return {
      ...enriched,
      bills: bills.map((b) => new Bill(b).toSafeJSON()),
      payments: payments.map((p) => new Payment(p).toSafeJSON()),
      returns: returns.map((r) => new Return(r).toSafeJSON()),
    }
  },
}

export default customerService
