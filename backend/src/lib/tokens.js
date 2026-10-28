import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

/**
 * Access token: short-lived stateless JWT signed with the server secret.
 * The SPA keeps it in memory only (never in localStorage).
 */
export const signAccessToken = (user) =>
  jwt.sign(
    { sub: String(user._id), role: user.role, store: user.store ? String(user.store) : null },
    env.jwtSecret,
    { expiresIn: env.accessTokenExpiresIn },
  )

export const verifyAccessToken = (token) => jwt.verify(token, env.jwtSecret)

/**
 * Refresh token: cryptographically random, opaque string. Only its SHA-256
 * hash is persisted, so a database leak cannot be replayed as a live session.
 */
export const generateRefreshToken = () => crypto.randomBytes(48).toString('base64url')

export const hashRefreshToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex')

/** Reset tokens are also random + stored only as hashes. */
export const generateResetToken = () => crypto.randomBytes(32).toString('base64url')
export const hashResetToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex')
