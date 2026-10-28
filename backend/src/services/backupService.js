import mongoose from 'mongoose'
import Product from '../models/Product.js'
import Category from '../models/Category.js'
import Supplier from '../models/Supplier.js'
import Purchase from '../models/Purchase.js'
import Bill from '../models/Bill.js'
import Return from '../models/Return.js'
import Payment from '../models/Payment.js'
import Customer from '../models/Customer.js'
import InventoryAdjustment from '../models/InventoryAdjustment.js'
import Store from '../models/Store.js'
import User from '../models/User.js'
import { badRequest } from '../lib/http-error.js'

const BACKUP_VERSION = 2
const REQUIRED_COLLECTIONS = ['products', 'bills', 'customers', 'suppliers', 'purchases', 'returns', 'payments']

const escapeCsv = (value) => {
  const s = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export const backupService = {
  /**
   * Builds a complete, portable snapshot of one store. Never includes password
   * hashes, tokens or other users' records.
   */
  async export(storeId) {
    const store = await Store.findById(storeId).lean()
    if (!store) throw badRequest('No store is linked to this account.')
    const owner = await User.findOne({ store: storeId, role: 'Owner' }).select('name email phone').lean()

    const [products, categories, suppliers, purchases, bills, returns, payments, customers, adjustments] =
      await Promise.all([
        Product.find({ store: storeId }).lean(),
        Category.find({ store: storeId }).lean(),
        Supplier.find({ store: storeId }).lean(),
        Purchase.find({ store: storeId }).lean(),
        Bill.find({ store: storeId }).lean(),
        Return.find({ store: storeId }).lean(),
        Payment.find({ store: storeId }).lean(),
        Customer.find({ store: storeId }).lean(),
        InventoryAdjustment.find({ store: storeId }).lean(),
      ])

    return {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      store: { ...store, _id: undefined, id: String(store._id) },
      owner: owner ? { name: owner.name, email: owner.email, phone: owner.phone } : null,
      collections: {
        products: products.map((p) => ({ ...p, _id: undefined, id: String(p._id) })),
        categories: categories.map((c) => ({ ...c, _id: undefined, id: String(c._id) })),
        suppliers: suppliers.map((s) => ({ ...s, _id: undefined, id: String(s._id) })),
        purchases: purchases.map((p) => ({ ...p, _id: undefined, id: String(p._id) })),
        bills: bills.map((b) => ({ ...b, _id: undefined, id: String(b._id) })),
        returns: returns.map((r) => ({ ...r, _id: undefined, id: String(r._id) })),
        payments: payments.map((p) => ({ ...p, _id: undefined, id: String(p._id) })),
        customers: customers.map((c) => ({ ...c, _id: undefined, id: String(c._id) })),
        adjustments: adjustments.map((a) => ({ ...a, _id: undefined, id: String(a._id) })),
      },
    }
  },

  /** Validates the shape of an uploaded backup before anything is written. */
  validate(payload) {
    if (!payload || typeof payload !== 'object') throw badRequest('This file could not be read.')
    if (payload.version !== BACKUP_VERSION)
      throw badRequest(`This backup was made by a different version of Grovio (expected v${BACKUP_VERSION}).`)
    for (const key of REQUIRED_COLLECTIONS) {
      if (!Array.isArray(payload.collections?.[key]))
        throw badRequest(`This is not a Grovio backup: "${key}" is missing.`)
    }
    if (!payload.store || typeof payload.store.name !== 'string') throw badRequest('This backup has no store record.')
    return true
  },

  /**
   * Restores a validated snapshot into the caller's store. Existing records for
   * this store are replaced by the snapshot's, so a restore is deliberate and
   * reversible only by restoring an earlier backup.
   */
  async restore(storeId, payload) {
    this.validate(payload)
    const c = payload.collections
    const strip = (docs) =>
      docs.map((d) => {
        const { _id, id, ...rest } = d
        return rest
      })

    // Re-point every cross-reference at the caller's store: a restore can
    // never move another store's records into this one.
    const storeObjectId = new mongoose.Types.ObjectId(String(storeId))
    const rebind = (doc) => ({ ...doc, store: storeObjectId })

    await Promise.all([
      Product.deleteMany({ store: storeId }),
      Category.deleteMany({ store: storeId }),
      Supplier.deleteMany({ store: storeId }),
      Purchase.deleteMany({ store: storeId }),
      Bill.deleteMany({ store: storeId }),
      Return.deleteMany({ store: storeId }),
      Payment.deleteMany({ store: storeId }),
      Customer.deleteMany({ store: storeId }),
      InventoryAdjustment.deleteMany({ store: storeId }),
    ])

    const inserts = [
      Category.insertMany(strip(c.categories).map(rebind), { ordered: false }),
      Supplier.insertMany(strip(c.suppliers).map(rebind), { ordered: false }),
      Customer.insertMany(strip(c.customers).map(rebind), { ordered: false }),
      Product.insertMany(strip(c.products).map(rebind), { ordered: false }),
      Purchase.insertMany(strip(c.purchases).map(rebind), { ordered: false }),
      Bill.insertMany(strip(c.bills).map(rebind), { ordered: false }),
      Return.insertMany(strip(c.returns).map(rebind), { ordered: false }),
      Payment.insertMany(strip(c.payments).map(rebind), { ordered: false }),
      InventoryAdjustment.insertMany(strip(c.adjustments ?? []).map(rebind), { ordered: false }),
    ]
    await Promise.all(inserts)
    return { restored: true, counts: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v.length])) }
  },

  /** CSV of a single collection, for spreadsheet exports. */
  toCsv(rows, columns) {
    const head = columns.map((c) => escapeCsv(c.label)).join(',')
    const body = rows
      .map((row) => columns.map((c) => escapeCsv(typeof c.value === 'function' ? c.value(row) : row[c.key])).join(','))
      .join('\n')
    return `${head}\n${body}\n`
  },
}

export default backupService
