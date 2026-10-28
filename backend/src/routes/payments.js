import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../lib/validate.js'
import { rupees, rupeesPositive, objectId, optionalObjectId } from '../lib/schemas.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireStore } from '../middleware/requireStore.js'
import { asyncHandler, ok } from '../lib/http-error.js'
import paymentService from '../services/paymentService.js'

const router = Router()
router.use(requireAuth, requireStore)

const createSchema = z
  .object({
    direction: z.enum(['in', 'out']).optional(),
    amount: rupeesPositive(),
    method: z.enum(['Cash', 'UPI', 'Card', 'Bank transfer', 'Credit adjustment']).optional(),
    billId: optionalObjectId,
    purchaseId: optionalObjectId,
    customerId: optionalObjectId,
    supplierId: optionalObjectId,
    reference: z.string().trim().max(120).optional(),
    note: z.string().trim().max(400).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.direction === 'out') {
      if (!data.purchaseId && !data.supplierId)
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Choose the purchase or supplier this pays.', path: ['purchaseId'] })
    } else if (!data.billId && !data.customerId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Choose the bill or customer this settles.', path: ['billId'] })
    }
  })

router.get(
  '/',
  validate(
    z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      sort: z.string().trim().max(40).optional(),
      direction: z.enum(['in', 'out']).optional(),
      method: z.string().trim().max(40).optional(),
      customerId: optionalObjectId,
      supplierId: optionalObjectId,
      billId: optionalObjectId,
      from: z.string().trim().max(40).optional(),
      to: z.string().trim().max(40).optional(),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const result = await paymentService.list(req.storeId, req.query)
    ok(res, { data: result })
  }),
)

router.get('/customers/:id/ledger', asyncHandler(async (req, res) => {
  const data = await paymentService.customerLedger(req.storeId, req.params.id)
  ok(res, { data })
}))

router.post(
  '/',
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const item = await paymentService.record(
      req.storeId,
      { ...req.body, amount: req.body.amount },
      { id: req.user._id, name: req.user.name },
    )
    ok(res, { status: 201, message: 'Payment recorded.', data: { item: item.toSafeJSON() } })
  }),
)

export default router
