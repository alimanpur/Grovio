import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../lib/validate.js'
import { requireAuth } from '../middleware/requireAuth.js'
import Store from '../models/Store.js'
import { asyncHandler, ok } from '../lib/http-error.js'

const router = Router()

const KEY = 'futureLabVotes'

/**
 * Future Lab votes. These are stored on the store so the picks survive a
 * device change; they are preferences only and never affect live behaviour.
 */
router.get(
  '/votes',
  requireAuth,
  asyncHandler(async (req, res) => {
    const store = await Store.findById(req.user.store).select(KEY).lean()
    ok(res, { data: { votes: store?.[KEY] || [] } })
  }),
)

router.post(
  '/votes',
  requireAuth,
  validate(
    z.object({
      item: z.string().trim().min(2).max(120),
      picked: z.boolean(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { item, picked } = req.body
    const store = await Store.findById(req.user.store)
    if (!store) return ok(res, { data: { votes: [] } })
    const current = Array.isArray(store[KEY]) ? store[KEY] : []
    const next = picked ? [...new Set([...current, item])] : current.filter((v) => v !== item)
    store[KEY] = next
    store.markModified(KEY)
    await store.save()
    ok(res, { data: { votes: next } })
  }),
)

export default router
