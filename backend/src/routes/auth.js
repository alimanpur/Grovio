import { Router } from 'express'
import cookieParser from 'cookie-parser'
import { z } from 'zod'
import { validate } from '../lib/validate.js'
import authController from '../controllers/authController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { csrfProtect } from '../middleware/csrf.js'
import { rateLimit } from '../middleware/rateLimit.js'

const router = Router()

// Populates req.cookies for the cookie-based refresh/CSRF flow.
router.use(cookieParser())

const password = z
  .string({ required_error: 'Password is required.' })
  .min(8, 'Use at least 8 characters.')
  .max(128, 'Password is too long.')

const registerSchema = z.object({
  name: z.string({ required_error: 'Name is required.' }).trim().min(2, 'Name is required.').max(120),
  storeName: z.string({ required_error: 'Store name is required.' }).trim().min(2, 'Store name is required.').max(160),
  phone: z.string({ required_error: 'Mobile number is required.' }).trim().min(6, 'Enter a valid mobile number.').max(32),
  email: z
    .string({ required_error: 'Email is required.' })
    .trim()
    .email('Enter a valid email address.')
    .max(254),
  password,
})

const loginSchema = z.object({
  identifier: z.string({ required_error: 'Enter your email or phone.' }).trim().min(3, 'Enter your email or phone.').max(254),
  password: z.string({ required_error: 'Password is required.' }).min(1, 'Password is required.').max(128),
  remember: z.boolean().optional(),
})

const forgotSchema = z.object({
  email: z.string({ required_error: 'Email is required.' }).trim().email('Enter a valid email address.').max(254),
})

const resetSchema = z
  .object({
    token: z.string({ required_error: 'Reset token is missing.' }).min(10, 'Reset token is invalid.'),
    password,
    confirmPassword: z.string({ required_error: 'Confirm your password.' }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

const changePasswordSchema = z
  .object({
    currentPassword: z.string({ required_error: 'Enter your current password.' }).min(1).max(128),
    newPassword: password,
    confirmNewPassword: z.string({ required_error: 'Confirm your new password.' }),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: 'Passwords do not match.',
    path: ['confirmNewPassword'],
  })

const onboardingSchema = z.object({
  store: z
    .object({
      name: z.string().trim().min(2).max(160).optional(),
      ownerName: z.string().trim().min(2).max(120).optional(),
      phone: z.string().trim().min(6).max(32).optional(),
      address: z.string().trim().max(400).optional(),
      gstNumber: z.string().trim().max(20).optional(),
      currency: z.string().trim().length(3).optional(),
      timezone: z.string().trim().max(48).optional(),
      businessType: z.string().trim().max(60).optional(),
      logoUrl: z.string().trim().max(500).optional(),
    })
    .optional(),
})

const ipKey = (req) => req.ip || 'unknown'
const ipAndField = (field) => (req) => `${req.ip || 'unknown'}:${String(req.body?.[field] || '').toLowerCase()}`

router.post(
  '/register',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 20, key: ipKey, message: 'Too many accounts created from this network. Try again later.' }),
  validate(registerSchema),
  authController.register,
)

router.post(
  '/login',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10, key: ipAndField('identifier'), message: 'Too many sign-in attempts. Wait a few minutes and try again.' }),
  validate(loginSchema),
  authController.login,
)

router.post(
  '/refresh',
  rateLimit({ windowMs: 60 * 1000, max: 60, key: ipKey }),
  csrfProtect,
  authController.refresh,
)

router.post('/logout', csrfProtect, authController.logout)

router.get('/me', requireAuth, authController.me)

router.post(
  '/forgot-password',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 5, key: ipAndField('email'), message: 'Too many reset requests. Please wait before trying again.' }),
  validate(forgotSchema),
  authController.forgotPassword,
)

router.post(
  '/reset-password',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, key: ipKey }),
  validate(resetSchema),
  authController.resetPassword,
)

router.post('/change-password', requireAuth, csrfProtect, validate(changePasswordSchema), authController.changePassword)

// Completing onboarding changes the store record and establishes the session,
// so it is covered by the same double-submit CSRF protection as other
// state-changing, cookie-authenticated routes.
router.post('/onboarding/complete', requireAuth, csrfProtect, validate(onboardingSchema), authController.completeOnboarding)

export default router
