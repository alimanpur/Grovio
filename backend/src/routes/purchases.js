import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../lib/validate.js'
import { rupees, rupeesPositive, objectId, optionalObjectId } from '../lib/schemas.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireStore } from '../middleware/requireStore.js'
import { asyncHandler, ok } from '../lib/http-error.js'
import purchaseService, { PURCHASE_LIST_STATUSES } from '../services/purchaseService.js'
import { PURCHASE_STATUSES } from '../models/Purchase.js'
import { recordPayment } from '../services/paymentService.js'

const router = Router()
router.use(requireAuth, requireStore)

const lineSchema = z.object({
  productId: objectId(),
  qty: z.coerce.number().int().min(1, 'Quantity must be at least 1.'),
  cost: rupees('Enter a valid cost in rupees.').optional(),
  gstRate: z.coerce.number().optional(),
})

const createSchema = z.object({
  supplierId: objectId(),
  supplierInvoiceNo: z.string().trim().max(60).optional(),
  lines: z.array(lineSchema).min(1, 'Add at least one product line.'),
  status: z.enum(PURCHASE_STATUSES).optional(),
  note: z.string().trim().max(400).optional(),
  expectedAt: z.coerce.date().optional(),
})

router.get(
  '/',
  validate(
    z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      search: z.string().trim().max(120).optional(),
      sort: z.string().trim().max(40).optional(),
      status: z.enum(PURCHASE_LIST_STATUSES).optional(),
      supplierId: optionalObjectId,
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const result = await purchaseService.list(req.storeId, req.query)
    ok(res, { data: result })
  }),
)

router.get('/:id', asyncHandler(async (req, res) => {
  const item = await purchaseService.get(req.storeId, req.params.id)
  ok(res, { data: { item: item.toSafeJSON() } })
}))

router.post('/', validate(createSchema), asyncHandler(async (req, res) => {
  const item = await purchaseService.create(req.storeId, req.body, { id: req.user._id, name: req.user.name })
  ok(res, { status: 201, message: `${item.orderNo} raised.`, data: { item: item.toSafeJSON() } })
}))

router.patch(
  '/:id',
  validate(
    z.object({
      supplierInvoiceNo: z.string().trim().max(60).optional(),
      note: z.string().trim().max(400).optional(),
      status: z.enum(PURCHASE_STATUSES).optional(),
      expectedAt: z.coerce.date().nullable().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const item = await purchaseService.update(req.storeId, req.params.id, req.body)
    ok(res, { message: `${item.orderNo} updated.`, data: { item: item.toSafeJSON() } })
  }),
)

router.post(
  '/:id/receive',
  validate(z.object({ lines: z.array(z.object({ productId: objectId(), qty: z.coerce.number().int().min(0) })).optional() }).partial()),
  asyncHandler(async (req, res) => {
    const item = await purchaseService.receive(req.storeId, req.params.id, req.body ?? {}, { id: req.user._id, name: req.user.name })
    ok(res, {
      message: item.status === 'Goods received' ? 'Stock received. Inventory updated.' : 'Part of the order received.',
      data: { item: item.toSafeJSON() },
    })
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
        direction: 'out',
        amount: req.body.amount,
        method: req.body.method || 'Bank transfer',
        purchaseId: req.params.id,
        reference: req.body.reference,
        note: req.body.note,
      },
      { id: req.user._id, name: req.user.name },
    )
    ok(res, { status: 201, message: 'Payment recorded.', data: { item: payment.toSafeJSON() } })
  }),
)

router.post(
  '/:id/cancel',
  validate(z.object({ reason: z.string().trim().min(3, 'Give a reason.').max(200) })),
  asyncHandler(async (req, res) => {
    const item = await purchaseService.cancel(req.storeId, req.params.id, req.body)
    ok(res, { message: `${item.orderNo} cancelled.`, data: { item: item.toSafeJSON() } })
  }),
)

export default router
