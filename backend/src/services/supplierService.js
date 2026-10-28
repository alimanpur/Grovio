import Supplier from '../models/Supplier.js'
import Purchase from '../models/Purchase.js'
import Payment from '../models/Payment.js'
import { badRequest, notFound } from '../lib/http-error.js'
import { rethrowDuplicate } from '../lib/records.js'
import { parsePagination, parseSort, buildSearch, pageMeta } from '../lib/query.js'
import { toRupees } from '../lib/money.js'

const SORTABLE = ['name', 'createdAt', 'updatedAt']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const assertValid = (payload, { partial = false } = {}) => {
  const name = String(payload.name ?? '').trim()
  if (!partial || payload.name !== undefined) {
    if (name.length < 2) throw badRequest('Give the supplier a name.')
  }
  const email = String(payload.email ?? '').trim()
  if (email && !EMAIL_RE.test(email)) throw badRequest('Enter a valid supplier email address.')
  if (payload.openingDue !== undefined && payload.openingDue < 0)
    throw badRequest('Opening balance cannot be negative.')
}

export const supplierService = {
  async list(storeId, query = {}) {
    const { page, limit, skip } = parsePagination(query)
    const sort = parseSort(query, SORTABLE, { name: 1 })
    const filter = { store: storeId }
    if (query.archived !== 'true') filter.archived = false
    const search = buildSearch(['name', 'contactName', 'phone', 'email', 'city', 'gstin'], query.search)
    if (search) Object.assign(filter, search)
    const [docs, total] = await Promise.all([
      Supplier.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Supplier.countDocuments(filter),
    ])
    return { items: docs.map((d) => new Supplier(d).toSafeJSON()), meta: pageMeta(total, page, limit) }
  },

  async get(storeId, id) {
    const supplier = await Supplier.findOne({ _id: id, store: storeId })
    if (!supplier) throw notFound('Supplier not found.')
    return supplier
  },

  async create(storeId, payload) {
    assertValid(payload)
    const gstin = String(payload.gstin ?? '').trim().toUpperCase()
    try {
      return await Supplier.create({
        store: storeId,
        name: String(payload.name).trim(),
        contactName: String(payload.contactName ?? '').trim(),
        phone: String(payload.phone ?? '').trim(),
        email: String(payload.email ?? '').trim().toLowerCase(),
        address: String(payload.address ?? '').trim(),
        city: String(payload.city ?? '').trim(),
        gstin,
        openingDue: payload.openingDue ?? 0,
        paymentTerms: String(payload.paymentTerms ?? '').trim(),
        notes: String(payload.notes ?? '').trim(),
      })
    } catch (err) {
      rethrowDuplicate(err, 'A supplier with that name already exists.')
    }
  },

  async update(storeId, id, payload) {
    const supplier = await this.get(storeId, id)
    assertValid(payload, { partial: true })
    for (const key of ['contactName', 'phone', 'address', 'city', 'gstin', 'paymentTerms', 'notes']) {
      if (payload[key] !== undefined) supplier[key] = String(payload[key]).trim()
    }
    if (payload.email !== undefined) supplier.email = String(payload.email).trim().toLowerCase()
    if (payload.name !== undefined) supplier.name = String(payload.name).trim()
    if (payload.openingDue !== undefined) supplier.openingDue = payload.openingDue
    if (payload.archived !== undefined) supplier.archived = Boolean(payload.archived)
    try {
      await supplier.save()
      return supplier
    } catch (err) {
      rethrowDuplicate(err, 'A supplier with that name already exists.')
    }
  },

  async remove(storeId, id) {
    const supplier = await this.get(storeId, id)
    const used = await Purchase.exists({ store: storeId, supplier: supplier._id })
    if (used) {
      supplier.archived = true
      await supplier.save()
      return { archived: true }
    }
    await supplier.deleteOne()
    return { deleted: true }
  },

  /**
   * What the store still owes: the recorded opening balance plus every received
   * purchase, less every outgoing payment already made.
   */
  async outstanding(storeId) {
    const suppliers = await Supplier.find({ store: storeId }).lean()
    if (!suppliers.length) return []
    const ids = suppliers.map((s) => s._id)
    const [purchases, payments] = await Promise.all([
      Purchase.find({ store: storeId, supplier: { $in: ids }, status: { $in: ['Ordered', 'In transit', 'Goods received'] } })
        .select('supplier total status')
        .lean(),
      Payment.find({ store: storeId, direction: 'out', supplier: { $in: ids } })
        .select('supplier amount')
        .lean(),
    ])
    const byId = new Map(suppliers.map((s) => [String(s._id), s]))
    const received = new Map()
    const ordered = new Map()
    for (const p of purchases) {
      const key = String(p.supplier)
      // Only goods actually received are owed; open orders are shown separately.
      if (p.status === 'Goods received') received.set(key, (received.get(key) || 0) + p.total)
      else ordered.set(key, (ordered.get(key) || 0) + p.total)
    }
    for (const pay of payments) {
      const key = String(pay.supplier)
      received.set(key, (received.get(key) || 0) - pay.amount)
    }
    return suppliers.map((s) => {
      const key = String(s._id)
      const base = byId.get(key)
      return {
        id: key,
        name: s.name,
        contactName: s.contactName,
        phone: s.phone,
        city: s.city,
        paymentTerms: s.paymentTerms,
        openingDue: toRupees(base?.openingDue || 0),
        received: toRupees(received.get(key) || 0),
        ordered: toRupees(ordered.get(key) || 0),
        outstanding: toRupees(Math.max(0, (base?.openingDue || 0) + (received.get(key) || 0))),
      }
    })
  },
}

export default supplierService
