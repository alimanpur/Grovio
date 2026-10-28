import crypto from 'node:crypto'
import { env } from '../config/env.js'

export const REFRESH_COOKIE = 'grovio_rt'
export const CSRF_COOKIE = 'grovio_csrf'

const baseCookie = (maxAgeMs) => ({
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: env.cookie.sameSite,
  ...(env.cookie.domain ? { domain: env.cookie.domain } : {}),
  path: '/',
  ...(maxAgeMs ? { maxAge: maxAgeMs } : {}),
})

export const setRefreshCookie = (res, token, maxAgeMs) =>
  res.cookie(REFRESH_COOKIE, token, baseCookie(maxAgeMs))

export const clearRefreshCookie = (res) =>
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    ...(env.cookie.domain ? { domain: env.cookie.domain } : {}),
    path: '/',
  })

/**
 * Double-submit CSRF token: a non-HttpOnly cookie that the SPA echoes in the
 * `X-CSRF-Token` header on state-changing, cookie-authenticated requests
 * (refresh, logout, change-password). Essential when SameSite=None.
 */
export const generateCsrfToken = () => crypto.randomBytes(24).toString('base64url')

// The CSRF cookie mirrors the session lifetime (maxAge) so it survives a
// browser restart alongside the refresh cookie; it still rotates on every
// login/refresh and is cleared on logout.
export const setCsrfCookie = (res, token, maxAgeMs) =>
  res.cookie(CSRF_COOKIE, token, { ...baseCookie(maxAgeMs), httpOnly: false })

export const clearCsrfCookie = (res) =>
  res.clearCookie(CSRF_COOKIE, {
    httpOnly: false,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    ...(env.cookie.domain ? { domain: env.cookie.domain } : {}),
    path: '/',
  })
