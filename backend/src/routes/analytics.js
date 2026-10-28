import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../lib/validate.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireStore } from '../middleware/requireStore.js'
import { asyncHandler, ok } from '../lib/http-error.js'
import { parseDateRange } from '../lib/query.js'
import analyticsService from '../services/analyticsService.js'

const router = Router()
router.use(requireAuth, requireStore)

const rangeQuery = z.object({
  from: z.string().trim().max(40).optional(),
  to: z.string().trim().max(40).optional(),
  days: z.coerce.number().int().min(1).max(90).optional(),
})

/**
 * `days` is honoured only when no explicit `from` is supplied. The default
 * window always ends at the current business day so "last 7 days" includes
 * today's sales.
 *
 * Returns `{ from, to }` — the shape every analytics service consumes.
 */
const window = (query, fallbackDays, maxDays) => {
  const { range } = parseDateRange(query, { maxDays })
  if (range.$gte) return { from: range.$gte, to: range.$lte ?? new Date() }
  const span = Math.max(1, Math.min(90, fallbackDays))
  const end = range.$lte ?? new Date()
  // 330 minutes = IST; the store's business day drives every chart.
  const shifted = new Date(end.getTime() + 330 * 60000)
  const today = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()))
  today.setMinutes(today.getMinutes() - 330)
  return { from: new Date(today.getTime() - (span - 1) * 86400000), to: end }
}

router.get('/today', asyncHandler(async (req, res) => {
  const data = await analyticsService.today(req.storeId)
  ok(res, { data })
}))

router.get(
  '/pulse',
  validate(z.object({ limit: z.coerce.number().int().min(1).max(100).optional() }), 'query'),
  asyncHandler(async (req, res) => {
    const items = await analyticsService.pulse(req.storeId, { limit: Number(req.query.limit || 40) })
    ok(res, { data: { items } })
  }),
)

router.get('/sales', validate(rangeQuery, 'query'), asyncHandler(async (req, res) => {
  const range = window(req.query, req.query.days || 7, 90)
  const data = await analyticsService.sales(req.storeId, range)
  ok(res, { data })
}))

router.get('/reports', validate(rangeQuery, 'query'), asyncHandler(async (req, res) => {
  const range = window(req.query, req.query.days || 30, 365)
  const data = await analyticsService.report(req.storeId, range)
  ok(res, { data })
}))

router.get('/gst', validate(rangeQuery, 'query'), asyncHandler(async (req, res) => {
  const range = window(req.query, req.query.days || 30, 365)
  const data = await analyticsService.gst(req.storeId, range)
  ok(res, { data })
}))

export default router
