import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../lib/validate.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireStore } from '../middleware/requireStore.js'
import { asyncHandler, ok } from '../lib/http-error.js'
import inventoryService from '../services/inventoryService.js'
import { adjustmentReasons } from '../models/InventoryAdjustment.js'

const router = Router()
router.use(requireAuth, requireStore)

router.get(
  '/',
  validate(
    z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(200).optional(),
      search: z.string().trim().max(120).optional(),
      categoryId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
      sort: z.string().trim().max(40).optional(),
      stock: z.enum(['all', 'low', 'out', 'ok']).optional(),
      lowStock: z.enum(['true', 'false']).optional(),
      outOfStock: z.enum(['true', 'false']).optional(),
      expiring: z.enum(['true', 'false']).optional(),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const result = await inventoryService.list(req.storeId, req.query)
    ok(res, { data: result })
  }),
)

router.get(
  '/history',
  validate(
    z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      productId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const result = await inventoryService.history(req.storeId, req.query)
    ok(res, { data: result })
  }),
)

router.get('/reasons', (_req, res) => ok(res, { data: { reasons: adjustmentReasons } }))

router.post(
  '/:productId/adjust',
  validate(
    z.object({
      delta: z.coerce.number().int().refine((n) => n !== 0, { message: 'Enter a whole, non-zero change.' }),
      reason: z.enum(adjustmentReasons),
      note: z.string().trim().max(400).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { product, adjustment } = await inventoryService.adjust(req.storeId, req.params.productId, req.body, {
      id: req.user._id,
      name: req.user.name,
    })
    ok(res, { message: `${product.name} is now ${product.stock} ${product.unit}.`, data: { item: product.toSafeJSON(), adjustment: adjustment.toSafeJSON() } })
  }),
)

export default router
