import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../lib/validate.js'
import { rupees, rupeesPositive, objectId, optionalObjectId } from '../lib/schemas.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireStore } from '../middleware/requireStore.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { csrfProtect } from '../middleware/csrf.js'
import { asyncHandler, ok } from '../lib/http-error.js'
import { categoryService, productService } from '../services/catalogService.js'
import { unitOptions, gstOptions } from '../models/Product.js'

const router = Router()
router.use(requireAuth, requireStore)

const categorySchema = z.object({
  name: z.string().trim().min(2, 'Give the category a name.').max(80),
  description: z.string().trim().max(400).optional(),
})

const productSchema = z.object({
  name: z.string().trim().min(2, 'Give the product a name.').max(160),
  brand: z.string().trim().max(80).optional(),
  sku: z.string().trim().max(40).optional(),
  barcode: z.string().trim().max(40).optional(),
  hsn: z.string().trim().max(8).optional(),
  categoryId: optionalObjectId,
  unit: z.enum(unitOptions).optional(),
  sellingPrice: rupees('Enter a valid price in rupees.'),
  purchasePrice: rupees('Enter a valid cost in rupees.').optional(),
  gstRate: z.coerce.number().refine((n) => gstOptions.includes(n), { message: 'Choose a GST slab.' }).optional(),
  stock: z.coerce.number().int().min(0).max(1000000).optional(),
  minStock: z.coerce.number().int().min(0).max(1000000).optional(),
  maxStock: z.coerce.number().int().min(0).max(1000000).optional(),
  supplierId: optionalObjectId,
  batch: z.string().trim().max(40).optional(),
  expiry: z.coerce.date().nullable().optional(),
})

const productPatch = productSchema.partial().extend({ archived: z.boolean().optional() })

router.get('/meta', (_req, res) =>
  ok(res, { data: { units: unitOptions, gstRates: gstOptions } }),
)

/* ---------------------------------------------------------------- categories */

router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const items = await categoryService.list(req.storeId, req.query)
    ok(res, { data: { items } })
  }),
)

router.post(
  '/categories',
  validate(categorySchema),
  asyncHandler(async (req, res) => {
    const item = await categoryService.create(req.storeId, req.body)
    ok(res, { status: 201, message: 'Category added.', data: { item } })
  }),
)

router.patch(
  '/categories/:id',
  validate(categorySchema.partial().extend({ archived: z.boolean().optional() })),
  asyncHandler(async (req, res) => {
    const item = await categoryService.update(req.storeId, req.params.id, req.body)
    ok(res, { message: 'Category updated.', data: { item } })
  }),
)

router.delete(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    await categoryService.remove(req.storeId, req.params.id)
    ok(res, { message: 'Category removed. Its products are now uncategorised.' })
  }),
)

/* ------------------------------------------------------------------ products */

router.get(
  '/products',
  validate(
    z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      search: z.string().trim().max(120).optional(),
      categoryId: optionalObjectId,
      category: z.string().trim().max(80).optional(),
      sort: z.string().trim().max(40).optional(),
      archived: z.enum(['true', 'false']).optional(),
      lowStock: z.enum(['true', 'false']).optional(),
      outOfStock: z.enum(['true', 'false']).optional(),
      expiring: z.enum(['true', 'false']).optional(),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const result = await productService.list(req.storeId, req.query)
    ok(res, { data: result })
  }),
)

router.get(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const item = await productService.get(req.storeId, req.params.id)
    ok(res, { data: { item: item.toSafeJSON() } })
  }),
)

router.post(
  '/products',
  validate(productSchema),
  asyncHandler(async (req, res) => {
    const item = await productService.create(req.storeId, req.body)
    ok(res, { status: 201, message: `${item.name} added.`, data: { item: item.toSafeJSON() } })
  }),
)

router.patch(
  '/products/:id',
  validate(productPatch),
  asyncHandler(async (req, res) => {
    const item = await productService.update(req.storeId, req.params.id, req.body)
    ok(res, { message: `${item.name} updated.`, data: { item: item.toSafeJSON() } })
  }),
)

router.post(
  '/products/:id/archive',
  rateLimit({ windowMs: 60000, max: 60 }),
  csrfProtect,
  asyncHandler(async (req, res) => {
    const item = await productService.archive(req.storeId, req.params.id)
    ok(res, { message: `${item.name} archived.`, data: { item: item.toSafeJSON() } })
  }),
)

router.post(
  '/products/:id/restore',
  csrfProtect,
  asyncHandler(async (req, res) => {
    const item = await productService.restore(req.storeId, req.params.id)
    ok(res, { message: `${item.name} restored.`, data: { item: item.toSafeJSON() } })
  }),
)

export default router
