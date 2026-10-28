import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../lib/validate.js'
import { rupees, rupeesPositive, objectId, optionalObjectId } from '../lib/schemas.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireStore } from '../middleware/requireStore.js'
import { asyncHandler, ok } from '../lib/http-error.js'
import supplierService from '../services/supplierService.js'

const router = Router()
router.use(requireAuth, requireStore)

const supplierSchema = z.object({
  name: z.string().trim().min(2, 'Give the supplier a name.').max(160),
  contactName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(32).optional(),
  email: z.string().trim().email('Enter a valid email address.').max(254).optional().or(z.literal('')),
  address: z.string().trim().max(400).optional(),
  city: z.string().trim().max(120).optional(),
  gstin: z.string().trim().max(20).optional(),
  openingDue: rupees().optional(),
  paymentTerms: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(1000).optional(),
})

router.get(
  '/',
  validate(
    z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      search: z.string().trim().max(120).optional(),
      sort: z.string().trim().max(40).optional(),
      archived: z.enum(['true', 'false']).optional(),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const result = await supplierService.list(req.storeId, req.query)
    ok(res, { data: result })
  }),
)

router.get('/outstanding', asyncHandler(async (req, res) => {
  const items = await supplierService.outstanding(req.storeId)
  ok(res, { data: { items } })
}))

router.get('/:id', asyncHandler(async (req, res) => {
  const item = await supplierService.get(req.storeId, req.params.id)
  ok(res, { data: { item: item.toSafeJSON() } })
}))

router.post('/', validate(supplierSchema), asyncHandler(async (req, res) => {
  const item = await supplierService.create(req.storeId, req.body)
  ok(res, { status: 201, message: `${item.name} added.`, data: { item: item.toSafeJSON() } })
}))

router.patch('/:id', validate(supplierSchema.partial().extend({ archived: z.boolean().optional() })), asyncHandler(async (req, res) => {
  const item = await supplierService.update(req.storeId, req.params.id, req.body)
  ok(res, { message: `${item.name} updated.`, data: { item: item.toSafeJSON() } })
}))

router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await supplierService.remove(req.storeId, req.params.id)
  ok(res, { message: result.archived ? 'Supplier archived (they have purchase history).' : 'Supplier removed.' })
}))

export default router
