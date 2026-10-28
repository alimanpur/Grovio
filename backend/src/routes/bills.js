import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../lib/validate.js'
import { rupees, rupeesPositive, objectId, optionalObjectId } from '../lib/schemas.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireStore } from '../middleware/requireStore.js'
import { asyncHandler, ok } from '../lib/http-error.js'
import billService from '../services/billService.js'
import { recordPayment } from '../services/paymentService.js'
import { BILL_STATUSES, PAYMENT_METHODS } from '../models/Bill.js'

const router = Router()
router.use(requireAuth, requireStore)

const lineSchema = z.object({
  productId: objectId(),
  qty: z.coerce.number().int().min(1, 'Quantity must be at least 1.'),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
})

const createSchema = z.object({
  lines: z.array(lineSchema).min(1, 'Add at least one product to the bill.'),
  customerId: optionalObjectId,
  method: z.enum(PAYMENT_METHODS).optional(),
  note: z.string().trim().max(400).optional(),
})

router.get(
  '/',
  validate(
    z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      search: z.string().trim().max(120).optional(),
      sort: z.string().trim().max(40).optional(),
      status: z.enum(BILL_STATUSES).optional(),
      method: z.enum(PAYMENT_METHODS).optional(),
      customerId: optionalObjectId,
      from: z.string().trim().max(40).optional(),
      to: z.string().trim().max(40).optional(),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const result = await billService.list(req.storeId, req.query)
    ok(res, { data: result })
  }),
)

router.get('/:id', asyncHandler(async (req, res) => {
  const item = await billService.get(req.storeId, req.params.id)
  ok(res, { data: { item: item.toSafeJSON() } })
}))

router.post('/', validate(createSchema), asyncHandler(async (req, res) => {
  const item = await billService.create(req.storeId, req.body, { id: req.user._id, name: req.user.name })
  ok(res, { status: 201, message: `${item.invoiceNo} saved. Stock updated.`, data: { item } })
}))

router.patch(
  '/:id',
  validate(z.object({ note: z.string().trim().max(400) })),
  asyncHandler(async (req, res) => {
    const item = await billService.updateNote(req.storeId, req.params.id, req.body)
    ok(res, { message: 'Bill note saved.', data: { item: item.toSafeJSON() } })
  }),
)

router.post(
  '/:id/pay',
  validate(
    z.object({
      amount: rupeesPositive(),
      method: z.enum(['Cash', 'UPI', 'Card', 'Bank transfer']).optional(),
      reference: z.string().trim().max(120).optional(),
      note: z.string().trim().max(400).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const payment = await recordPayment(
      req.storeId,
      {
        direction: 'in',
        amount: req.body.amount,
        method: req.body.method || 'Cash',
        billId: req.params.id,
        reference: req.body.reference,
        note: req.body.note,
      },
      { id: req.user._id, name: req.user.name },
    )
    ok(res, { status: 201, message: 'Payment recorded.', data: { item: payment.toSafeJSON() } })
  }),
)

/** Cancelling is the only way to reverse a bill; it restores stock and audit. */
router.post(
  '/:id/cancel',
  validate(z.object({ reason: z.string().trim().min(3, 'Give a reason.').max(200) })),
  asyncHandler(async (req, res) => {
    const item = await billService.cancel(req.storeId, req.params.id, req.body, { id: req.user._id, name: req.user.name })
    ok(res, { message: `${item.invoiceNo} cancelled. Stock restored.`, data: { item: item.toSafeJSON() } })
  }),
)

export default router
