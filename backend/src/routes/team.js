import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../lib/validate.js'
import { requireAuth, requireRole } from '../middleware/requireAuth.js'
import { requireStore } from '../middleware/requireStore.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { asyncHandler, ok } from '../lib/http-error.js'
import teamService from '../services/teamService.js'
import { roleOptions } from '../services/teamService.js'

const router = Router()
router.use(requireAuth, requireStore)

const createSchema = z.object({
  name: z.string().trim().min(2, 'Enter a name.').max(120),
  email: z.string().trim().email('Enter a valid email address.').max(254),
  phone: z.string().trim().max(32).optional(),
  role: z.enum(roleOptions).optional(),
  password: z.string().min(8, 'Use at least 8 characters.').max(128),
})

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(32).optional(),
  role: z.enum(roleOptions).optional(),
})

router.get('/roles', (_req, res) => ok(res, { data: { roles: roleOptions } }))

router.get(
  '/',
  validate(
    z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      search: z.string().trim().max(120).optional(),
      sort: z.string().trim().max(40).optional(),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const result = await teamService.list(req.storeId, req.query)
    ok(res, { data: result })
  }),
)

router.post(
  '/',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 30, message: 'Too many team invites. Try again later.' }),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const item = await teamService.create(req.storeId, req.body, req.user)
    ok(res, { status: 201, message: `${item.name} added as ${item.role}.`, data: { item } })
  }),
)

router.patch('/:id', validate(patchSchema), asyncHandler(async (req, res) => {
  const item = await teamService.update(req.storeId, req.params.id, req.body, req.user)
  ok(res, { message: `${item.name} updated.`, data: { item } })
}))

router.post(
  '/:id/status',
  validate(z.object({ status: z.enum(['active', 'disabled']) })),
  asyncHandler(async (req, res) => {
    const item = await teamService.setStatus(req.storeId, req.params.id, req.body.status, req.user)
    ok(res, {
      message: item.status === 'disabled' ? `${item.name} disabled and signed out.` : `${item.name} reactivated.`,
      data: { item },
    })
  }),
)

export default router
