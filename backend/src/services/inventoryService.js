import Product from '../models/Product.js'
import InventoryAdjustment from '../models/InventoryAdjustment.js'
import { badRequest, conflict, notFound } from '../lib/http-error.js'
import { parsePagination, parseSort, pageMeta } from '../lib/query.js'
import { toRupees } from '../lib/money.js'
import { adjustmentReasons } from '../models/InventoryAdjustment.js'

const SORTABLE = ['name', 'stock', 'sellingPrice', 'updatedAt', 'expiry']

/**
 * Applies a stock delta to a product and writes an immutable adjustment row.
 *
 * The product update is guarded (`stock: stockBefore`) so two concurrent
 * movements cannot both read the same baseline; a lost race raises a conflict
 * the caller can retry instead of silently dropping a unit.
 *
 * `session` is optional: when a caller already runs inside a transaction the
 * same session must be threaded through, otherwise the stock write lands
 * outside the transaction and MongoDB aborts with a write conflict.
 */
export const applyStockDelta = async ({
  storeId,
  product,
  delta,
  reason,
  note = '',
  source = 'manual',
  sourceId = '',
  actor,
  session,
}) => {
  if (!Number.isInteger(delta) || delta === 0) throw badRequest('Enter a whole, non-zero quantity change.')
  const stockBefore = product.stock
  // A reduction can never take stock below zero — that would silently lose units.
  if (delta < 0 && Math.abs(delta) > stockBefore)
    throw badRequest(`Only ${stockBefore} ${product.unit} of ${product.name} on the shelf.`)
  const stockAfter = stockBefore + delta

  const updated = await Product.findOneAndUpdate(
    { _id: product._id, store: storeId, stock: stockBefore },
    { $set: { stock: stockAfter } },
    { new: true, ...(session ? { session } : {}) },
  )
  if (!updated) throw conflict('Stock changed while you were working. Reload and try again.')

  const [adjustment] = await InventoryAdjustment.create(
    [
      {
        store: storeId,
        product: product._id,
        productName: product.name,
        delta,
        stockBefore,
        stockAfter,
        reason,
        note,
        source,
        sourceId,
        createdBy: actor?.id ?? null,
        actorName: actor?.name || '',
      },
    ],
    session ? { session } : {},
  )
  return { product: updated, adjustment }
}

export const inventoryService = {
  /** Inventory list with low-stock / out-of-stock / expiring filters and totals. */
  async list(storeId, query = {}) {
    const { page, limit, skip } = parsePagination(query, { defaultLimit: 50, maxLimit: 200 })
    const sort = parseSort(query, SORTABLE, { name: 1 })
    const filter = { store: storeId, archived: false }
    if (query.lowStock === 'true') filter.$expr = { $lte: ['$stock', '$minStock'] }
    if (query.outOfStock === 'true') filter.stock = 0
    if (query.expiring === 'true') {
      filter.expiry = { $ne: null, $lte: new Date(Date.now() + 30 * 86400000) }
    }
    if (query.categoryId) filter.category = query.categoryId
    const stockFilter = String(query.stock || '')
    // $expr is an expression tree, so each comparison must be its own object.
    const stockExpr = {
      low: { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$minStock'] }] },
      out: { $eq: ['$stock', 0] },
      ok: { $gt: ['$stock', '$minStock'] },
    }
    if (stockFilter === 'out') filter.stock = 0
    else if (stockFilter && stockExpr[stockFilter]) filter.$expr = stockExpr[stockFilter]

    const items = await Product.find(filter).sort(sort).skip(skip).limit(limit).lean()
    const total = await Product.countDocuments(filter)

    // Value and health figures are computed over the whole catalogue, not just
    // this page, so the header totals always agree with the data.
    const all = await Product.find({ store: storeId, archived: false })
      .select('stock purchasePrice minStock expiry name unit')
      .lean()
    const stockValue = all.reduce((sum, p) => sum + p.stock * p.purchasePrice, 0)
    const retailValue = all.reduce((sum, p) => sum + p.stock * p.sellingPrice, 0)
    const low = all.filter((p) => p.stock === 0).length + all.filter((p) => p.stock > 0 && p.stock <= p.minStock).length
    const out = all.filter((p) => p.stock === 0).length
    const expiring = all.filter((p) => p.expiry && p.expiry <= new Date(Date.now() + 30 * 86400000) && p.stock > 0).length

    return {
      items: items.map((p) => new Product(p).toSafeJSON()),
      meta: pageMeta(total, page, limit),
      summary: {
        stockValue: toRupees(stockValue),
        retailValue: toRupees(retailValue),
        products: all.length,
        low,
        out,
        expiring,
      },
    }
  },

  async adjust(storeId, productId, payload, actor) {
    const product = await Product.findOne({ _id: productId, store: storeId })
    if (!product) throw notFound('Product not found.')
    if (!adjustmentReasons.includes(payload.reason)) throw badRequest('Choose a stock-change reason.')
    return applyStockDelta({
      storeId,
      product,
      delta: payload.delta,
      reason: payload.reason,
      note: String(payload.note || ''),
      source: 'manual',
      actor,
    })
  },

  async history(storeId, query = {}) {
    const { page, limit, skip } = parsePagination(query, { defaultLimit: 30, maxLimit: 100 })
    const filter = { store: storeId }
    if (query.productId) filter.product = query.productId
    const [items, total] = await Promise.all([
      InventoryAdjustment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      InventoryAdjustment.countDocuments(filter),
    ])
    return {
      items: items.map((a) => new InventoryAdjustment(a).toSafeJSON()),
      meta: pageMeta(total, page, limit),
    }
  },
}


export default inventoryService
