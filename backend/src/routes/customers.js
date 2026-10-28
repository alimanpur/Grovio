import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../lib/validate.js'
import { rupees, rupeesPositive, objectId, optionalObjectId } from '../lib/schemas.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireStore } from '../middleware/requireStore.js'
import { asyncHandler, ok } from '../lib/http-error.js'
import customerService from '../services/customerService.js'

const router = Router()
router.use(requireAuth, requireStore)

const customerSchema = z.object({
  name: z.string().trim().min(2, 'Give the customer a name.').max(160),
  phone: z.string().trim().max(32).optional(),
  email: z.string().trim().email('Enter a valid email address.').max(254).optional().or(z.literal('')),
  address: z.string().trim().max(400).optional(),
  gstin: z.string().trim().max(20).optional(),
  openingDue: rupees().optional(),
  creditLimit: rupees().optional(),
  tag: z.enum(['New', 'Frequent', 'Bulk', 'Credit', 'Dormant']).optional(),
  note: z.string().trim().max(1000).optional(),
})

router.get(
  '/',
  validate(
    z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      search: z.string().trim().max(120).optional(),
      sort: z.string().trim().max(40).optional(),
      withDues: z.enum(['true', 'false']).optional(),
      archived: z.enum(['true', 'false']).optional(),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const result = await customerService.list(req.storeId, req.query)
    ok(res, { data: result })
  }),
)

router.get('/:id', asyncHandler(async (req, res) => {
  const item = await customerService.get(req.storeId, req.params.id)
  ok(res, { data: { item } })
}))

router.get('/:id/history', asyncHandler(async (req, res) => {
  const item = await customerService.history(req.storeId, req.params.id)
  ok(res, { data: { item } })
}))

router.post('/', validate(customerSchema), asyncHandler(async (req, res) => {
  const item = await customerService.create(req.storeId, req.body)
  ok(res, { status: 201, message: `${item.name} added.`, data: { item: item.toSafeJSON() } })
}))

router.patch('/:id', validate(customerSchema.partial().extend({ archived: z.boolean().optional() })), asyncHandler(async (req, res) => {
  const item = await customerService.update(req.storeId, req.params.id, req.body)
  ok(res, { message: `${item.name} updated.`, data: { item: item.toSafeJSON() } })
}))

router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await customerService.remove(req.storeId, req.params.id)
  ok(res, { message: result.archived ? 'Customer archived (they have bill history).' : 'Customer removed.' })
}))

export default router
