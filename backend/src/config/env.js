import process from 'node:process'

/**
 * Centralised, validated configuration.
 * Secrets are read from the environment only; nothing sensitive has an
 * insecure production default. See .env.example for the full list.
 */

const isProd = process.env.NODE_ENV === 'production'

const optionalInt = (name, fallback) => {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : fallback
}

const boolFrom = (value) => value === 'true' || value === '1'

// Cookie security: Secure + SameSite=None only make sense cross-site in prod.
const cookieSecure =
  process.env.COOKIE_SECURE !== undefined
    ? boolFrom(process.env.COOKIE_SECURE)
    : isProd
const cookieSameSite =
  process.env.COOKIE_SAMESITE ||
  (isProd ? 'none' : 'lax') // cross-site prod needs 'none', same-origin dev uses 'lax'

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd,
  isTest: process.env.NODE_ENV === 'test',
  port: optionalInt('PORT', 3001),

  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/grovio',
  // Test suite runs against an isolated database on the same cluster.
  mongoTestUri: process.env.MONGODB_TEST_URI || process.env.MONGODB_URI,
  // Presentation demo: a dedicated, isolated database used only by the seed
  // script. Must be configured explicitly so demo fixtures can never land in
  // production or any other environment.
  mongoDemoUri: process.env.MONGODB_DEMO_URI || '',

  // Access tokens (JWT, held in memory by the SPA).
  jwtSecret: process.env.JWT_SECRET || '',
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',

  // Refresh tokens (opaque, stored hashed, HttpOnly cookie, rotating).
  refreshTtlDays: optionalInt('REFRESH_TOKEN_TTL_DAYS', 7),
  refreshTtlDaysRemembered: optionalInt('REFRESH_TOKEN_TTL_DAYS_REMEMBERED', 30),

  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  cookie: {
    domain: process.env.COOKIE_DOMAIN || undefined,
    secure: cookieSecure,
    sameSite: cookieSameSite,
  },

  resetTokenTtlMinutes: optionalInt('RESET_TOKEN_TTL_MINUTES', 30),

  // Password-reset workflow without an email provider.
  // NEVER expose reset tokens in production; guarded by NODE_ENV.
  exposeDevResetToken: !isProd && boolFrom(process.env.EXPOSE_DEV_RESET_TOKEN || 'true'),

  // Optional email delivery. When empty, reset links are not emailed
  // (documented development limitation); sign-up/forgot still behave safely.
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: optionalInt('SMTP_PORT', 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'Grovio <no-reply@grovio.app>',
  },
}

export const requireEnv = () => {
  const missing = []
  if (!env.jwtSecret) missing.push('JWT_SECRET')
  if (!env.mongoUri) missing.push('MONGODB_URI')
  if (missing.length) {
    // Fail fast rather than boot with an insecure/undefined configuration.
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        'Copy .env.example to .env and fill in the values.',
    )
  }
  if (env.isProd && env.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.')
  }
}

export default env
