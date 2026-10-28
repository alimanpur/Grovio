import crypto from 'node:crypto'
import { forbidden } from '../lib/http-error.js'
import { CSRF_COOKIE } from '../lib/cookies.js'

const safeEqual = (a, b) => {
  const ab = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

/**
 * Double-submit CSRF protection for cookie-authenticated, state-changing
 * requests. The SPA reads the non-HttpOnly `grovio_csrf` cookie and echoes it
 * in the `X-CSRF-Token` header; a cross-site attacker cannot read the cookie
 * to craft the matching header.
 */
export const csrfProtect = (req, _res, next) => {
  const cookieToken = req.cookies?.[CSRF_COOKIE]
  const headerToken = req.get('X-CSRF-Token') || req.get('x-csrf-token')
  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    return next(forbidden('Invalid or missing CSRF token.'))
  }
  next()
}

export default csrfProtect
