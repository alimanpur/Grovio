import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../lib/validate.js'
import { requireAuth, requireRole } from '../middleware/requireAuth.js'
import { requireStore } from '../middleware/requireStore.js'
import { asyncHandler, ok } from '../lib/http-error.js'
import storeService from '../services/storeService.js'
import { gstRateOptions } from '../models/Product.js'

const router = Router()
router.use(requireAuth, requireStore)

const profileSchema = z.object({
  name: z.string().trim().min(2, 'The store needs a name.').max(160).optional(),
  ownerName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(32).optional(),
  email: z.string().trim().email('Enter a valid email address.').max(254).optional().or(z.literal('')),
  address: z.string().trim().max(400).optional(),
  gstNumber: z.string().trim().max(20).optional(),
  fssai: z.string().trim().max(20).optional(),
  hours: z.string().trim().max(120).optional(),
  businessType: z.string().trim().max(60).optional(),
  logoUrl: z.string().trim().max(500).optional(),
  currency: z.string().trim().length(3).optional(),
  timezone: z.string().trim().max(48).optional(),
})

const invoiceSchema = z.object({
  prefix: z.string().trim().max(5).optional(),
  terms: z.string().trim().max(1000).optional(),
  footerNote: z.string().trim().max(400).optional(),
  showQr: z.boolean().optional(),
  showBarcode: z.boolean().optional(),
  upiId: z.string().trim().max(60).optional(),
  logoUrl: z.string().trim().max(500).optional(),
})

const taxSchema = z.object({
  taxes: z
    .array(
      z.object({
        rate: z.coerce.number(),
        label: z.string().trim().max(60).optional(),
        enabled: z.boolean().optional(),
      }),
    )
    .min(1, 'Provide at least one GST slab.'),
})

const preferenceSchema = z.object({
  lowStockAlerts: z.boolean().optional(),
  expiryAlerts: z.boolean().optional(),
  dailySummary: z.boolean().optional(),
  soundOnScan: z.boolean().optional(),
  roundTotals: z.boolean().optional(),
})

router.get('/profile', asyncHandler(async (req, res) => {
  const store = await storeService.profile(req.storeId)
  ok(res, { data: { store: store.toSafeJSON() } })
}))

router.put(
  '/profile',
  validate(profileSchema),
  asyncHandler(async (req, res) => {
    const store = await storeService.updateProfile(req.storeId, req.body)
    ok(res, { message: 'Store profile saved.', data: { store: store.toSafeJSON() } })
  }),
)

router.get('/invoice', asyncHandler(async (req, res) => {
  const settings = await storeService.invoiceSettings(req.storeId)
  ok(res, { data: { settings } })
}))

router.put('/invoice', validate(invoiceSchema), asyncHandler(async (req, res) => {
  const settings = await storeService.updateInvoiceSettings(req.storeId, req.body)
  ok(res, { message: 'Invoice settings saved.', data: { settings } })
}))

router.get('/taxes', asyncHandler(async (req, res) => {
  const taxes = await storeService.taxes(req.storeId)
  ok(res, { data: { taxes, options: gstRateOptions } })
}))

router.put('/taxes', validate(taxSchema), asyncHandler(async (req, res) => {
  const taxes = await storeService.updateTaxes(req.storeId, req.body)
  ok(res, { message: 'GST slabs saved. New bills will use these rates.', data: { taxes } })
}))

router.get('/preferences', asyncHandler(async (req, res) => {
  const preferences = await storeService.preferences(req.storeId)
  ok(res, { data: { preferences } })
}))

router.put(
  '/preferences',
  // Store-wide preferences affect every employee, so only an owner may change them.
  requireRole('Owner'),
  validate(preferenceSchema),
  asyncHandler(async (req, res) => {
    const preferences = await storeService.updatePreferences(req.storeId, req.body)
    ok(res, { message: 'Preferences saved.', data: { preferences } })
  }),
)

export default router
