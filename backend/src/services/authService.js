import mongoose from 'mongoose'
import { env } from '../config/env.js'
import User from '../models/User.js'
import Store from '../models/Store.js'
import RefreshToken from '../models/RefreshToken.js'
import { badRequest, conflict, forbidden, unauthorized } from '../lib/http-error.js'
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  generateResetToken,
  hashResetToken,
} from '../lib/tokens.js'

const DAY = 24 * 60 * 60 * 1000

const refreshMaxAge = (remember) =>
  (remember ? env.refreshTtlDaysRemembered : env.refreshTtlDays) * DAY

/** Look up an account by email or phone (the sign-in field allows either). */
const findByIdentifier = (identifier) => {
  const value = String(identifier).trim()
  const query = value.includes('@') ? { email: value.toLowerCase() } : { phone: value }
  return User.findOne(query).select('+passwordHash')
}

const isDuplicateEmail = (err) =>
  err?.code === 11000 && (err.keyPattern?.email || err.message?.includes('email'))

/**
 * Issues a short-lived access token + a rotating refresh session and returns
 * the raw refresh token (to be set as an HttpOnly cookie by the controller).
 */
const issueSession = async (user, ctx = {}, remember = false) => {
  const accessToken = signAccessToken(user)
  const refreshToken = generateRefreshToken()
  await RefreshToken.create({
    user: user._id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: new Date(Date.now() + refreshMaxAge(remember)),
    userAgent: ctx.userAgent || '',
    ip: ctx.ip || '',
  })
  return { accessToken, refreshToken, maxAgeMs: refreshMaxAge(remember) }
}

export const authService = {
  async register({ name, storeName, phone, email, password }, ctx = {}) {
    const normalizedEmail = String(email).trim().toLowerCase()
    if (await User.exists({ email: normalizedEmail })) {
      throw conflict('That email is already registered. Try signing in instead.')
    }

    // Public sign-up always creates an Owner + its own store. Privileged roles
    // are never taken from the request body.
    const user = new User({ name, email: normalizedEmail, phone, role: 'Owner', status: 'active' })
    await user.setPassword(password)

    try {
      await user.save()

      // Complete the circular user<->store reference: user first, then store.
      const store = await Store.create({
        name: storeName,
        ownerName: name,
        owner: user._id,
        phone,
        onboardingCompleted: false,
      })
      user.store = store._id
      await user.save()
      await user.populate('store')
    } catch (err) {
      if (isDuplicateEmail(err)) throw conflict('That email is already registered. Try signing in instead.')
      if (user?._id) await User.deleteOne({ _id: user._id }).catch(() => {})
      throw err
    }

    const session = await issueSession(user, ctx, false)
    return { user, ...session }
  },

  async login({ identifier, password, remember }, ctx = {}) {
    const user = await findByIdentifier(identifier)
    // Uniform error so we never reveal whether an account exists.
    const generic = unauthorized('Invalid credentials. Check your details and try again.')
    if (!user) throw generic
    if (user.status !== 'active') throw forbidden('This account has been disabled. Contact your store administrator.')

    const valid = await user.verifyPassword(password)
    if (!valid) throw generic

    // Refresh the "last active" stamp shown on the team page.
    user.lastLoginAt = new Date()
    await user.save()

    await user.populate('store')
    const session = await issueSession(user, ctx, Boolean(remember))
    return { user, ...session }
  },

  async refresh(rawToken, ctx = {}) {
    if (!rawToken) throw unauthorized('Session expired. Please sign in again.')

    const tokenHash = hashRefreshToken(rawToken)
    const existing = await RefreshToken.findOne({ tokenHash })
    if (!existing) throw unauthorized('Session expired. Please sign in again.')

    // Reuse detection: a presented-but-revoked token means a bearer may have
    // replayed an old (rotated) token — drop the whole session family.
    if (existing.revokedAt) {
      await RefreshToken.updateMany(
        { user: existing.user, revokedAt: null },
        { $set: { revokedAt: new Date() } },
      )
      throw unauthorized('Session expired. Please sign in again.')
    }

    if (existing.expiresAt.getTime() <= Date.now()) {
      await existing.deleteOne()
      throw unauthorized('Session expired. Please sign in again.')
    }

    const user = await User.findById(existing.user)
    if (!user || user.status !== 'active') throw unauthorized('Session expired. Please sign in again.')

    // Rotate: revoke the old token and issue a fresh one.
    const refreshToken = generateRefreshToken()
    const newHash = hashRefreshToken(refreshToken)
    await RefreshToken.create({
      user: existing.user,
      tokenHash: newHash,
      expiresAt: new Date(Date.now() + refreshMaxAge(true)),
      userAgent: ctx.userAgent || existing.userAgent,
      ip: ctx.ip || existing.ip,
    })
    existing.revokedAt = new Date()
    existing.replacedBy = newHash
    await existing.save()

    await user.populate('store')
    const accessToken = signAccessToken(user)
    return { user, accessToken, refreshToken, maxAgeMs: refreshMaxAge(true) }
  },

  async logout(rawToken) {
    if (rawToken) {
      await RefreshToken.findOneAndUpdate(
        { tokenHash: hashRefreshToken(rawToken), revokedAt: null },
        { $set: { revokedAt: new Date() } },
      )
    }
    return { success: true }
  },

  async me(user) {
    const fresh = await User.findById(user._id).populate('store')
    if (!fresh) throw unauthorized('Session no longer valid.')
    return fresh
  },

  async forgotPassword(email) {
    const normalized = String(email).trim().toLowerCase()
    const user = await User.findOne({ email: normalized })
    // Always respond generically; never disclose whether the account exists.
    const generic = {
      message:
        'If an account exists for that address, we have sent a secure reset link that expires in ' +
        `${env.resetTokenTtlMinutes} minutes.`,
    }

    if (!user || user.status !== 'active') return generic

    const resetToken = generateResetToken()
    user.passwordResetTokenHash = hashResetToken(resetToken)
    user.passwordResetExpires = new Date(Date.now() + env.resetTokenTtlMinutes * 60 * 1000)
    await user.save()

    // Attempt real delivery only when an SMTP provider is configured.
    const resetUrl = `${env.clientOrigin}/reset-password?token=${resetToken}`
    const delivered = await trySendResetEmail(normalized, resetUrl)

    // Development-only fallback so the workflow can be tested end to end
    // without an email provider. Never exposed in production.
    if (!delivered && env.exposeDevResetToken) {
      return { ...generic, devResetToken: resetToken }
    }
    return generic
  },

  async resetPassword({ token, password }) {
    const tokenHash = hashResetToken(String(token))
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetTokenHash +passwordResetExpires')

    if (!user) {
      throw badRequest('This reset link is invalid or has expired. Request a new one.')
    }

    await user.setPassword(password)
    user.passwordResetTokenHash = null
    user.passwordResetExpires = null
    await user.save()

    // Invalidate every existing session (force re-authentication everywhere).
    await RefreshToken.updateMany(
      { user: user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    )

    return { success: true }
  },

  async changePassword(user, { currentPassword, newPassword }, currentRefreshToken) {
    const withHash = await User.findById(user._id).select('+passwordHash')
    if (!withHash || !(await withHash.verifyPassword(currentPassword))) {
      throw badRequest('Your current password is incorrect.')
    }
    await withHash.setPassword(newPassword)
    withHash.passwordResetTokenHash = null
    withHash.passwordResetExpires = null
    await withHash.save()

    // Sign out every other device, but keep the caller signed in here.
    const revokedAt = withHash.passwordChangedAt
    const filter = { user: withHash._id, revokedAt: null }
    if (currentRefreshToken) filter.tokenHash = { $ne: hashRefreshToken(currentRefreshToken) }
    await RefreshToken.updateMany(filter, { $set: { revokedAt } })
    return { success: true }
  },

  async completeOnboarding(user, storePatch = {}) {
    if (!user.store) throw badRequest('No store is linked to this account.')
    // Explicit allowlist — never trust arbitrary client fields.
    const allowed = ['name', 'ownerName', 'phone', 'address', 'gstNumber', 'currency', 'timezone', 'businessType', 'logoUrl']
    const update = {}
    for (const key of allowed) {
      if (storePatch[key] !== undefined) update[key] = storePatch[key]
    }
    update.onboardingCompleted = true
    await Store.findByIdAndUpdate(user.store, update, { new: true })
    const fresh = await User.findById(user._id).populate('store')
    return fresh
  },
}

export default authService

async function trySendResetEmail(to, resetUrl) {
  if (!env.smtp.host) return false
  // A concrete transport can be added here (e.g. nodemailer) and wired via the
  // SMTP_* variables. Until one is configured we never claim delivery.
  try {
    // eslint-disable-next-line no-console
    console.info(`[mailer] SMTP configured, but no transport is implemented for reset email to ${to}`)
    void resetUrl
    return false
  } catch {
    return false
  }
}
