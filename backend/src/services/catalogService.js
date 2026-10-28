import Category from '../models/Category.js'
import Product from '../models/Product.js'
import Supplier from '../models/Supplier.js'
import { badRequest, conflict, notFound } from '../lib/http-error.js'
import { isDuplicateKey, rethrowDuplicate } from '../lib/records.js'
import { parsePagination, parseSort, buildSearch, pageMeta } from '../lib/query.js'
import { GST_RATES, UNITS } from '../models/Product.js'

const CATEGORY_FIELDS = ['name', 'description']

export const categoryService = {
  async list(storeId, { includeArchived = false } = {}) {
    const query = { store: storeId }
    if (!includeArchived) query.archived = false
    const [categories, products] = await Promise.all([
      Category.find(query).sort({ name: 1 }).lean(),
      Product.find({ store: storeId }).select('category categoryName archived').lean(),
    ])
    const counts = new Map()
    for (const p of products) {
      const key = String(p.category)
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    return categories.map((c) => ({
      ...new Category(c).toSafeJSON(),
      products: counts.get(String(c._id)) || 0,
    }))
  },

  async create(storeId, payload) {
    const name = String(payload.name || '').trim()
    if (!name) throw badRequest('Give the category a name.')
    try {
      const category = await Category.create({
        store: storeId,
        name,
        description: String(payload.description || '').trim(),
      })
      return { ...category.toSafeJSON(), products: 0 }
    } catch (err) {
      rethrowDuplicate(err, 'A category with that name already exists.')
    }
  },

  async update(storeId, id, payload) {
    const category = await Category.findOne({ _id: id, store: storeId })
    if (!category) throw notFound('Category not found.')
    if (payload.name !== undefined) {
      const name = String(payload.name).trim()
      if (!name) throw badRequest('Give the category a name.')
      category.name = name
    }
    if (payload.description !== undefined) category.description = String(payload.description).trim()
    if (payload.archived !== undefined) category.archived = Boolean(payload.archived)
    try {
      await category.save()
    } catch (err) {
      rethrowDuplicate(err, 'A category with that name already exists.')
    }
    // Keep denormalised product.categoryName in step with a rename.
    if (payload.name !== undefined) {
      await Product.updateMany({ store: storeId, category: category._id }, { $set: { categoryName: category.name } })
    }
    const count = await Product.countDocuments({ store: storeId, category: category._id })
    return { ...category.toSafeJSON(), products: count }
  },

  /**
   * Archiving rather than deleting: products keep their category reference so
   * historical bills and reports stay readable.
   */
  async remove(storeId, id) {
    const category = await Category.findOne({ _id: id, store: storeId })
    if (!category) throw notFound('Category not found.')
    await Category.deleteOne({ _id: id, store: storeId })
    await Product.updateMany({ store: storeId, category: id }, { $set: { category: null, categoryName: 'Uncategorised' } })
    return { removed: true }
  },
}

/* ------------------------------------------------------------------ products */

const PRODUCT_SORTABLE = ['name', 'sellingPrice', 'stock', 'updatedAt', 'createdAt']

const normalizeText = (value) => String(value ?? '').trim()

export const productService = {
  async list(storeId, query = {}) {
    const { page, limit, skip } = parsePagination(query)
    const sort = parseSort(query, PRODUCT_SORTABLE, { name: 1 })

    const filter = { store: storeId }
    if (query.archived !== 'true') filter.archived = false
    if (query.categoryId) filter.category = query.categoryId
    if (query.category) filter.categoryName = query.category
    if (query.lowStock === 'true') filter.$expr = { $lte: ['$stock', '$minStock'] }
    if (query.outOfStock === 'true') filter.stock = 0
    if (query.expiring === 'true') {
      const horizon = new Date(Date.now() + 30 * 86400000)
      filter.expiry = { $ne: null, $lte: horizon }
    }
    const search = buildSearch(['name', 'brand', 'sku', 'barcode', 'categoryName', 'supplierName'], query.search)
    if (search) Object.assign(filter, search)

    const [items, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ])
    return { items: items.map((p) => new Product(p).toSafeJSON()), meta: pageMeta(total, page, limit) }
  },

  async get(storeId, id) {
    const product = await Product.findOne({ _id: id, store: storeId })
    if (!product) throw notFound('Product not found.')
    return product
  },

  async create(storeId, payload) {
    const name = normalizeText(payload.name)
    if (!name) throw badRequest('Give the product a name.')
    if (payload.categoryId && !(await Category.exists({ _id: payload.categoryId, store: storeId })))
      throw badRequest('Choose a category from this store.')
    if (payload.supplierId && !(await Supplier.exists({ _id: payload.supplierId, store: storeId })))
      throw badRequest('Choose a supplier from this store.')

    const sku = (normalizeText(payload.sku) || autoSku(name)).toUpperCase()
    const sellingPrice = payload.sellingPrice
    if (!(sellingPrice > 0)) throw badRequest('Selling price must be more than ₹0.')
    const purchasePrice = payload.purchasePrice ?? 0
    if (purchasePrice < 0) throw badRequest('Cost price cannot be negative.')
    if (purchasePrice > sellingPrice) throw badRequest('Cost price is above the selling price.')

    const minStock = payload.minStock ?? 0
    const maxStock = payload.maxStock ?? Math.max(10, (payload.stock ?? 0) * 2)
    if (minStock > maxStock) throw badRequest('Minimum stock cannot be above maximum stock.')

    const category = payload.categoryId ? await Category.findById(payload.categoryId).lean() : null
    const supplier = payload.supplierId ? await Supplier.findById(payload.supplierId).lean() : null

    try {
      const product = await Product.create({
        store: storeId,
        name,
        brand: normalizeText(payload.brand),
        sku,
        barcode: normalizeText(payload.barcode),
        hsn: normalizeText(payload.hsn),
        category: category?._id ?? null,
        categoryName: category?.name ?? normalizeText(payload.categoryName) ?? 'Uncategorised',
        unit: payload.unit || 'piece',
        sellingPrice,
        purchasePrice,
        gstRate: payload.gstRate ?? 0,
        stock: Math.max(0, payload.stock ?? 0),
        minStock,
        maxStock,
        supplier: supplier?._id ?? null,
        supplierName: supplier?.name ?? normalizeText(payload.supplierName) ?? '',
        batch: normalizeText(payload.batch),
        expiry: payload.expiry ?? null,
      })
      return product
    } catch (err) {
      if (isDuplicateKey(err)) throw conflict('That SKU is already used by another product in this store.')
      throw err
    }
  },

  async update(storeId, id, payload) {
    const product = await this.get(storeId, id)
    if (payload.categoryId !== undefined) {
      if (!payload.categoryId) {
        product.category = null
        product.categoryName = 'Uncategorised'
      } else {
        const category = await Category.findOne({ _id: payload.categoryId, store: storeId }).lean()
        if (!category) throw badRequest('Choose a category from this store.')
        product.category = category._id
        product.categoryName = category.name
      }
    }
    if (payload.supplierId !== undefined) {
      if (!payload.supplierId) {
        product.supplier = null
        product.supplierName = ''
      } else {
        const supplier = await Supplier.findOne({ _id: payload.supplierId, store: storeId }).lean()
        if (!supplier) throw badRequest('Choose a supplier from this store.')
        product.supplier = supplier._id
        product.supplierName = supplier.name
      }
    }
    const numeric = ['sellingPrice', 'purchasePrice', 'gstRate', 'minStock', 'maxStock', 'stock']
    for (const key of numeric) if (payload[key] !== undefined) product[key] = payload[key]
    const text = ['name', 'brand', 'sku', 'barcode', 'hsn', 'unit', 'batch']
    for (const key of text) if (payload[key] !== undefined) product[key] = normalizeText(payload[key])
    if (payload.expiry !== undefined) product.expiry = payload.expiry
    if (payload.archived !== undefined) product.archived = Boolean(payload.archived)

    if (!(product.sellingPrice > 0)) throw badRequest('Selling price must be more than ₹0.')
    if (product.purchasePrice < 0) throw badRequest('Cost price cannot be negative.')
    if (product.purchasePrice > product.sellingPrice) throw badRequest('Cost price is above the selling price.')
    if (product.minStock > product.maxStock) throw badRequest('Minimum stock cannot be above maximum stock.')

    try {
      await product.save()
      return product
    } catch (err) {
      if (isDuplicateKey(err)) throw conflict('That SKU is already used by another product in this store.')
      throw err
    }
  },

  /**
   * Archiving keeps historical bills and purchases readable. A product that is
   * on any bill line is never deleted.
   */
  async archive(storeId, id) {
    const product = await this.get(storeId, id)
    product.archived = true
    await product.save()
    return product
  },

  async restore(storeId, id) {
    const product = await Product.findOne({ _id: id, store: storeId })
    if (!product) throw notFound('Product not found.')
    product.archived = false
    await product.save()
    return product
  },
}

export const unitOptions = UNITS
export const gstOptions = GST_RATES
export const categoryFields = CATEGORY_FIELDS

const autoSku = (name) => {
  const letters = name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'PRD'
  return `${letters}-${Date.now().toString(36).slice(-4).toUpperCase()}`
}

export default { categoryService, productService }
