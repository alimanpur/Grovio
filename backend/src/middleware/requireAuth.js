import { forbidden, unauthorized } from '../lib/http-error.js'
import { verifyAccessToken } from '../lib/tokens.js'
import User from '../models/User.js'

const getBearer = (req) => {
  const header = req.get('Authorization') || ''
  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) return null
  return token.trim()
}

/**
 * Verifies the in-memory access token and loads the live user. Loading the
 * user (rather than trusting the token alone) means a disabled or deleted
 * account is rejected immediately, and controllers get `req.user` for
 * role-based authorization.
 */
export const requireAuth = async (req, _res, next) => {
  try {
    const token = getBearer(req)
    if (!token) return next(unauthorized('Authentication required.'))
    const payload = verifyAccessToken(token)
    const user = await User.findById(payload.sub)
    if (!user) return next(unauthorized('Session no longer valid.'))
    if (user.status !== 'active') return next(forbidden('This account is disabled.'))
    req.auth = { userId: String(user._id), role: user.role }
    req.user = user
    next()
  } catch (err) {
    if (err?.name === 'TokenExpiredError') {
      return next(unauthorized('Session expired.'))
    }
    return next(unauthorized('Invalid authentication token.'))
  }
}

/** Restricts a route to the given roles (authorization, not just auth). */
export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(forbidden('You do not have permission to perform this action.'))
  }
  next()
}

export default requireAuth
