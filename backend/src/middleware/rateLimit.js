import { tooMany } from '../lib/http-error.js'

/**
 * Minimal fixed-window, in-memory rate limiter (per process). Adequate for the
 * single-instance dev/test deployment; a multi-instance production deploy should
 * back this with a shared store (e.g. Redis). It only bans state-changing
 * authentication endpoints so it cannot throttle normal reads.
 */
const buckets = new Map()

const defaultKey = (req) => req.ip || 'unknown'

export function rateLimit({ windowMs = 60_000, max = 10, key = defaultKey, message } = {}) {
  return (req, _res, next) => {
    const id = `k:${key(req)}`
    const now = Date.now()
    const bucket = buckets.get(id)

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(id, { count: 1, resetAt: now + windowMs })
      return next()
    }

    bucket.count += 1
    if (bucket.count > max) {
      return next(tooMany(message))
    }
    next()
  }
}

// Periodically drop stale buckets so the map does not grow unbounded.
setInterval(() => {
  const now = Date.now()
  for (const [id, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(id)
  }
}, 60_000).unref()

// Test hook: clear all buckets so cases run deterministically.
export const __resetBuckets = () => buckets.clear()

export default rateLimit
