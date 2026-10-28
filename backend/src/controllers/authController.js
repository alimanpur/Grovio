import { asyncHandler, ok } from '../lib/http-error.js'
import authService from '../services/authService.js'
import {
  REFRESH_COOKIE,
  setRefreshCookie,
  clearRefreshCookie,
  clearCsrfCookie,
  generateCsrfToken,
  setCsrfCookie,
} from '../lib/cookies.js'

const ctx = (req) => ({ userAgent: req.get('User-Agent') || '', ip: req.ip || '' })

/** Safe, serialisable user payload (no hashes / secrets), plus store identity. */
const serializeUser = (user) => {
  const base = user.toSafeJSON()
  const store = user.store
    ? {
        id: String(user.store._id),
        name: user.store.name,
        onboardingCompleted: Boolean(user.store.onboardingCompleted),
      }
    : null
  return { ...base, store }
}

/** Establishes the client session: rotating refresh cookie + CSRF cookie. */
const establishSession = (res, { accessToken, refreshToken, maxAgeMs, user }) => {
  const csrfToken = generateCsrfToken()
  setRefreshCookie(res, refreshToken, maxAgeMs)
  setCsrfCookie(res, csrfToken, maxAgeMs)
  return {
    user: serializeUser(user),
    accessToken,
    tokenType: 'Bearer',
    expiresIn: undefined,
    csrfToken,
  }
}

export const authController = {
  register: asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken, maxAgeMs } = await authService.register(
      req.body,
      ctx(req),
    )
    const data = establishSession(res, { accessToken, refreshToken, maxAgeMs, user })
    ok(res, { status: 201, message: 'Account created successfully.', data })
  }),

  login: asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken, maxAgeMs } = await authService.login(req.body, ctx(req))
    const data = establishSession(res, { accessToken, refreshToken, maxAgeMs, user })
    ok(res, { message: 'Signed in successfully.', data })
  }),

  refresh: asyncHandler(async (req, res) => {
    const raw = req.cookies?.[REFRESH_COOKIE]
    const { user, accessToken, refreshToken, maxAgeMs } = await authService.refresh(raw, ctx(req))
    const data = establishSession(res, { accessToken, refreshToken, maxAgeMs, user })
    ok(res, { message: 'Session refreshed.', data })
  }),

  logout: asyncHandler(async (req, res) => {
    await authService.logout(req.cookies?.[REFRESH_COOKIE])
    clearRefreshCookie(res)
    clearCsrfCookie(res)
    ok(res, { message: 'Signed out successfully.' })
  }),

  me: asyncHandler(async (req, res) => {
    const user = await authService.me(req.user)
    ok(res, { data: { user: serializeUser(user) } })
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    const result = await authService.forgotPassword(req.body.email)
    // devResetToken is only populated by the service in non-production.
    ok(res, {
      message: result.message,
      ...(result.devResetToken ? { data: { devResetToken: result.devResetToken } } : {}),
    })
  }),

  resetPassword: asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body)
    ok(res, { message: 'Password updated. You can now sign in with your new password.' })
  }),

  changePassword: asyncHandler(async (req, res) => {
    await authService.changePassword(req.user, req.body, req.cookies?.[REFRESH_COOKIE])
    ok(res, { message: 'Password changed. Other devices have been signed out.' })
  }),

  completeOnboarding: asyncHandler(async (req, res) => {
    const user = await authService.completeOnboarding(req.user, req.body.store || {})
    ok(res, { message: 'Store setup complete.', data: { user: serializeUser(user) } })
  }),
}

export default authController
