import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../lib/validate.js'
import { requireAuth, requireRole } from '../middleware/requireAuth.js'
import { requireStore } from '../middleware/requireStore.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { asyncHandler, ok } from '../lib/http-error.js'
import backupService from '../services/backupService.js'
import express from 'express'

const router = Router()
// A backup contains every record in the store: owner-only.
router.use(requireAuth, requireStore, requireRole('Owner'))

// A full backup JSON is far larger than the default 16 kb cap, so this route
// installs its own bounded parser before the handler runs.
const backupBody = express.json({ limit: '8mb' })

router.get(
  '/export',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: 'Too many exports. Try again shortly.' }),
  asyncHandler(async (req, res) => {
    const data = await backupService.export(req.storeId)
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="grovio-backup-${new Date().toISOString().slice(0, 10)}.json"`)
    res.send(JSON.stringify(data))
  }),
)

router.get(
  '/preview',
  asyncHandler(async (req, res) => {
    const data = await backupService.export(req.storeId)
    ok(res, {
      data: {
        exportedAt: data.exportedAt,
        counts: Object.fromEntries(Object.entries(data.collections).map(([k, v]) => [k, v.length])),
      },
    })
  }),
)

router.post(
  '/restore',
  backupBody,
  rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: 'Too many restore attempts. Try again shortly.' }),
  validate(
    z.object({
      backup: z.record(z.unknown()),
    }),
  ),
  asyncHandler(async (req, res) => {
    const result = await backupService.restore(req.storeId, req.body.backup)
    ok(res, { message: 'Backup restored. Your store now matches the uploaded file.', data: result })
  }),
)

export default router
