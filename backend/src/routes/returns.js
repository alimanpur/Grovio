import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../lib/validate.js'
import { objectId, optionalObjectId } from '../lib/schemas.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireStore } from '../middleware/requireStore.js'
import { asyncHandler, ok } from '../lib/http-error.js'
import returnService from '../services/returnService.js'
import { RETURN_REASONS, RETURN_RESOLUTIONS } from '../models/Return.js'

const router = Router()
router.use(requireAuth, requireStore)


const createSchema = z.object({
  billId: objectId(),
  lines: z
    .array(z.object({ productId: objectId(), qty: z.coerce.number().int().min(1, 'Return at least one unit.') }))
    .min(1, 'Choose at least one item to return.'),
  reason: z.enum(RETURN_REASONS),
  resolution: z.enum(RETURN_RESOLUTIONS).optional(),
  restocked: z.boolean().optional(),
  note: z.string().trim().max(400).optional(),
})

router.get(
  '/eligible',
  validate(
    z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(50).optional(),
      search: z.string().trim().max(120).optional(),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const result = await returnService.eligible(req.storeId, req.query)
    ok(res, { data: result })
  }),
)

router.get(
  '/',
  validate(
    z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      billId: optionalObjectId,
      from: z.string().trim().max(40).optional(),
      to: z.string().trim().max(40).optional(),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const result = await returnService.list(req.storeId, req.query)
    ok(res, { data: result })
  }),
)

router.get('/:id', asyncHandler(async (req, res) => {
  const item = await returnService.get(req.storeId, req.params.id)
  ok(res, { data: { item: item.toSafeJSON() } })
}))

router.post('/', validate(createSchema), asyncHandler(async (req, res) => {
  const item = await returnService.create(req.storeId, req.body, { id: req.user._id, name: req.user.name })
  ok(res, {
    status: 201,
    message: `${item.returnNo} recorded. ${req.body.restocked === false ? 'Goods marked as not returnable to shelf.' : 'Stock restored.'}`,
    data: { item: item.toSafeJSON() },
  })
}))

export default router
