import { describe, test, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'

// --- Configure an isolated test environment BEFORE importing app code ------
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-value-abcdef-1234567890'
// The app connects via config/db.js only in server.js; tests manage connection.
process.env.CLIENT_ORIGIN = 'http://localhost:5173'
process.env.EXPOSE_DEV_RESET_TOKEN = 'true'

const { default: mongoose } = await import('mongoose')
await import('dotenv/config')

// Never reuse real production secrets/DB: dedicated test credentials + test DB.
const testUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI
assert.ok(testUri, 'MONGODB_TEST_URI or MONGODB_URI must be set to run tests')

const { default: app } = await import('../src/app.js')
const { default: User } = await import('../src/models/User.js')
const { default: Store } = await import('../src/models/Store.js')
const { default: RefreshToken } = await import('../src/models/RefreshToken.js')
const { __resetBuckets } = await import('../src/middleware/rateLimit.js')

let server
let base

const parseCookies = (res) => {
  const jar = {}
  const raw = res.headers.getSetCookie?.() || []
  for (const c of raw) {
    const [pair] = c.split(';')
    const idx = pair.indexOf('=')
    if (idx > -1) jar[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim()
  }
  return jar
}

const call = async (path, { method = 'GET', body, token, jar, csrf } = {}) => {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  if (csrf) headers['X-CSRF-Token'] = csrf
  if (jar) headers.Cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ')
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => null)
  return { status: res.status, json, cookies: parseCookies(res) }
}

const newUser = (over = {}) => ({
  name: 'Ramesh Sharma',
  storeName: 'Sharma Provision Store',
  phone: '+91 98110 00000',
  email: 'ramesh@sharmaprovision.in',
  password: 'grovio1234',
  ...over,
})

describe('Grovio authentication', () => {
  before(async () => {
    await mongoose.connect(testUri, { dbName: 'grovio_test', serverSelectionTimeoutMS: 10000 })
    await Promise.all([User.init(), Store.init(), RefreshToken.init()])
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        base = `http://127.0.0.1:${server.address().port}`
        resolve()
      })
    })
  })

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Store.deleteMany({}),
      RefreshToken.deleteMany({}),
    ])
    __resetBuckets()
  })

  after(async () => {
    __resetBuckets()
    await new Promise((resolve) => server.close(resolve))
    await mongoose.connection.dropDatabase().catch(() => {})
    await mongoose.disconnect()
  })

  test('registers an account, persists it, and issues a session', async () => {
    const { status, json, cookies } = await call('/api/auth/register', { method: 'POST', body: newUser() })
    assert.equal(status, 201)
    assert.equal(json.success, true)
    assert.equal(json.data.user.email, 'ramesh@sharmaprovision.in')
    assert.equal(json.data.user.role, 'Owner')
    assert.equal(json.data.user.store.onboardingCompleted, false)
    assert.ok(json.data.accessToken)
    // Refresh + CSRF cookies must be set.
    assert.ok(cookies.grovio_rt)
    assert.ok(cookies.grovio_csrf)
    // Secrets must never be returned.
    assert.equal(json.data.user.passwordHash, undefined)
    assert.equal(json.data.user.passwordResetTokenHash, undefined)

    const stored = await User.findOne({ email: 'ramesh@sharmaprovision.in' }).select('+passwordHash')
    assert.ok(stored, 'user persisted')
    assert.notEqual(stored.passwordHash, 'grovio1234')
    assert.match(stored.passwordHash, /^\$2[aby]\$/) // bcrypt hash
    assert.equal(await stored.verifyPassword('grovio1234'), true)
    const store = await Store.findOne({ owner: stored._id })
    assert.equal(store.name, 'Sharma Provision Store')
    assert.equal(String(stored.store), String(store._id))
  })

  test('rejects missing required fields with field errors', async () => {
    const { status, json } = await call('/api/auth/register', { method: 'POST', body: {} })
    assert.equal(status, 400)
    assert.equal(json.success, false)
    assert.ok(json.errors.email && json.errors.password && json.errors.name && json.errors.storeName && json.errors.phone)
  })

  test('rejects an invalid email format', async () => {
    const { status, json } = await call('/api/auth/register', {
      method: 'POST',
      body: newUser({ email: 'not-an-email' }),
    })
    assert.equal(status, 400)
    assert.ok(json.errors.email)
  })

  test('rejects a weak password (< 8 chars)', async () => {
    const { status, json } = await call('/api/auth/register', {
      method: 'POST',
      body: newUser({ email: 'weak@example.com', password: 'short' }),
    })
    assert.equal(status, 400)
    assert.ok(json.errors.password)
  })

  test('prevents duplicate registration with a useful error', async () => {
    await call('/api/auth/register', { method: 'POST', body: newUser() })
    const { status, json } = await call('/api/auth/register', { method: 'POST', body: newUser() })
    assert.equal(status, 409)
    assert.match(json.message, /already registered/i)
  })

  test('prevents self-assigning a privileged role at registration', async () => {
    const { status, json } = await call('/api/auth/register', {
      method: 'POST',
      body: newUser({ email: 'boss@example.com', role: 'Manager', status: 'active', isVerified: true }),
    })
    assert.equal(status, 201)
    assert.equal(json.data.user.role, 'Owner') // forced server-side
  })

  test('signs in with correct credentials (by email and by phone)', async () => {
    await call('/api/auth/register', { method: 'POST', body: newUser() })
    const byEmail = await call('/api/auth/login', {
      method: 'POST',
      body: { identifier: 'ramesh@sharmaprovision.in', password: 'grovio1234' },
    })
    assert.equal(byEmail.status, 200)
    assert.ok(byEmail.json.data.accessToken)
    assert.ok(byEmail.cookies.grovio_rt)

    const byPhone = await call('/api/auth/login', {
      method: 'POST',
      body: { identifier: '+91 98110 00000', password: 'grovio1234' },
    })
    assert.equal(byPhone.status, 200)
  })

  test('rejects incorrect credentials and unknown accounts identically', async () => {
    await call('/api/auth/register', { method: 'POST', body: newUser() })
    const wrongPass = await call('/api/auth/login', {
      method: 'POST',
      body: { identifier: 'ramesh@sharmaprovision.in', password: 'wrong-pass' },
    })
    const unknown = await call('/api/auth/login', {
      method: 'POST',
      body: { identifier: 'nobody@example.com', password: 'grovio1234' },
    })
    assert.equal(wrongPass.status, 401)
    assert.equal(unknown.status, 401)
    assert.equal(wrongPass.json.message, unknown.json.message) // no existence leak
  })

  test('returns the current user for a valid token and rejects without one', async () => {
    const reg = await call('/api/auth/register', { method: 'POST', body: newUser() })
    const me = await call('/api/auth/me', { token: reg.json.data.accessToken })
    assert.equal(me.status, 200)
    assert.equal(me.json.data.user.email, 'ramesh@sharmaprovision.in')
    assert.equal(me.json.data.user.passwordHash, undefined)

    const anon = await call('/api/auth/me')
    assert.equal(anon.status, 401)

    const bad = await call('/api/auth/me', { token: 'not-a-real-token' })
    assert.equal(bad.status, 401)
  })

  test('logs out, clears the cookie, and revokes the refresh session', async () => {
    const reg = await call('/api/auth/register', { method: 'POST', body: newUser() })
    const jar = { grovio_rt: reg.cookies.grovio_rt, grovio_csrf: reg.cookies.grovio_csrf }
    const out = await call('/api/auth/logout', { method: 'POST', jar, csrf: reg.cookies.grovio_csrf })
    assert.equal(out.status, 200)

    // Refresh with the now-revoked cookie must fail.
    const refreshed = await call('/api/auth/refresh', { method: 'POST', jar, csrf: reg.cookies.grovio_csrf })
    assert.equal(refreshed.status, 401)
  })

  test('refreshes access token and rotates the refresh token with reuse detection', async () => {
    const reg = await call('/api/auth/register', { method: 'POST', body: newUser() })
    const jar1 = { grovio_rt: reg.cookies.grovio_rt, grovio_csrf: reg.cookies.grovio_csrf }
    const r1 = await call('/api/auth/refresh', { method: 'POST', jar: jar1, csrf: jar1.grovio_csrf })
    assert.equal(r1.status, 200)
    assert.ok(r1.json.data.accessToken)
    const rotated = r1.cookies.grovio_rt
    assert.notEqual(rotated, reg.cookies.grovio_rt)

    // Reusing the OLD (now rotated) token triggers reuse detection.
    const replay = await call('/api/auth/refresh', { method: 'POST', jar: jar1, csrf: jar1.grovio_csrf })
    assert.equal(replay.status, 401)

    // The whole session family is revoked: the rotated token no longer works.
    const jar2 = { grovio_rt: rotated, grovio_csrf: r1.cookies.grovio_csrf }
    const after = await call('/api/auth/refresh', { method: 'POST', jar: jar2, csrf: jar2.grovio_csrf })
    assert.equal(after.status, 401)
  })

  test('blocks refresh without a CSRF token', async () => {
    const reg = await call('/api/auth/register', { method: 'POST', body: newUser() })
    const jar = { grovio_rt: reg.cookies.grovio_rt, grovio_csrf: reg.cookies.grovio_csrf }
    const noCsrf = await call('/api/auth/refresh', { method: 'POST', jar })
    assert.equal(noCsrf.status, 403)
  })

  test('forgot-password returns a generic response and (dev-only) a test token', async () => {
    await call('/api/auth/register', { method: 'POST', body: newUser() })
    const exists = await call('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: 'ramesh@sharmaprovision.in' },
    })
    assert.equal(exists.status, 200)
    assert.ok(exists.json.data.devResetToken) // dev-only convenience
    assert.equal(JSON.stringify(exists.json).includes('passwordHash'), false)

    // Unknown account: identical generic response, still 200.
    const missing = await call('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: 'stranger@example.com' },
    })
    assert.equal(missing.status, 200)
    assert.equal(missing.json.data?.devResetToken, undefined)
    assert.match(exists.json.message, /if an account exists/i)
    assert.equal(missing.json.message, exists.json.message)
  })

  test('rejects an invalid reset token', async () => {
    const { status, json } = await call('/api/auth/reset-password', {
      method: 'POST',
      body: { token: 'totally-invalid-token-value', password: 'brandnew123', confirmPassword: 'brandnew123' },
    })
    assert.equal(status, 400)
  })

  test('rejects a reset when passwords do not match', async () => {
    const { status, json } = await call('/api/auth/reset-password', {
      method: 'POST',
      body: { token: 'some-token-value-here', password: 'brandnew123', confirmPassword: 'different' },
    })
    assert.equal(status, 400)
    assert.ok(json.errors)
  })

  test('completes a password reset, invalidates old sessions, and blocks token reuse', async () => {
    await call('/api/auth/register', { method: 'POST', body: newUser() })
    // Establish a pre-reset session (refresh token).
    const pre = await call('/api/auth/login', {
      method: 'POST',
      body: { identifier: 'ramesh@sharmaprovision.in', password: 'grovio1234' },
    })
    const preJar = { grovio_rt: pre.cookies.grovio_rt, grovio_csrf: pre.cookies.grovio_csrf }

    const forgot = await call('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: 'ramesh@sharmaprovision.in' },
    })
    const token = forgot.json.data.devResetToken

    // Old session must be invalidated by the reset.
    const reset = await call('/api/auth/reset-password', {
      method: 'POST',
      body: { token, password: 'supersecret9', confirmPassword: 'supersecret9' },
    })
    assert.equal(reset.status, 200)

    const staleRefresh = await call('/api/auth/refresh', {
      method: 'POST',
      jar: preJar,
      csrf: preJar.grovio_csrf,
    })
    assert.equal(staleRefresh.status, 401)

    // Reusing the same reset token must fail.
    const reuse = await call('/api/auth/reset-password', {
      method: 'POST',
      body: { token, password: 'another1234', confirmPassword: 'another1234' },
    })
    assert.equal(reuse.status, 400)

    // Old password no longer works; the new one does.
    const oldLogin = await call('/api/auth/login', {
      method: 'POST',
      body: { identifier: 'ramesh@sharmaprovision.in', password: 'grovio1234' },
    })
    assert.equal(oldLogin.status, 401)
    const newLogin = await call('/api/auth/login', {
      method: 'POST',
      body: { identifier: 'ramesh@sharmaprovision.in', password: 'supersecret9' },
    })
    assert.equal(newLogin.status, 200)
  })

  test('rejects an expired reset token', async () => {
    await call('/api/auth/register', { method: 'POST', body: newUser() })
    // Force an expired token directly on the stored hash.
    const crypto = await import('node:crypto')
    const raw = 'expired-token-1234567890'
    const hash = crypto.createHash('sha256').update(raw).digest('hex')
    await User.updateOne(
      { email: 'ramesh@sharmaprovision.in' },
      { passwordResetTokenHash: hash, passwordResetExpires: new Date(Date.now() - 60_000) },
    )
    const { status } = await call('/api/auth/reset-password', {
      method: 'POST',
      body: { token: raw, password: 'brandnew123', confirmPassword: 'brandnew123' },
    })
    assert.equal(status, 400)
  })

  test('changes password, keeps current session, and requires the correct current password', async () => {
    const reg = await call('/api/auth/register', { method: 'POST', body: newUser() })
    const token = reg.json.data.accessToken
    const jar = { grovio_rt: reg.cookies.grovio_rt, grovio_csrf: reg.cookies.grovio_csrf }
    const csrf = reg.cookies.grovio_csrf

    const wrong = await call('/api/auth/change-password', {
      method: 'POST',
      token,
      jar,
      csrf,
      body: { currentPassword: 'nope', newPassword: 'thenewone1', confirmNewPassword: 'thenewone1' },
    })
    assert.equal(wrong.status, 400)

    const ok = await call('/api/auth/change-password', {
      method: 'POST',
      token,
      jar,
      csrf,
      body: { currentPassword: 'grovio1234', newPassword: 'thenewone1', confirmNewPassword: 'thenewone1' },
    })
    assert.equal(ok.status, 200)

    // Current device refresh still works; password actually changed.
    const stillWorks = await call('/api/auth/login', {
      method: 'POST',
      body: { identifier: 'ramesh@sharmaprovision.in', password: 'thenewone1' },
    })
    assert.equal(stillWorks.status, 200)
  })

  test('completes onboarding for the owner store', async () => {
    const reg = await call('/api/auth/register', { method: 'POST', body: newUser() })
    const token = reg.json.data.accessToken
    const jar = { grovio_rt: reg.cookies.grovio_rt, grovio_csrf: reg.cookies.grovio_csrf }
    const done = await call('/api/auth/onboarding/complete', {
      method: 'POST',
      token,
      jar,
      csrf: reg.cookies.grovio_csrf,
      body: { store: { name: 'Sharma Provision Store', gstNumber: '07AABCS1429B1ZX', currency: 'INR', timezone: 'IST', businessType: 'General Store' } },
    })
    assert.equal(done.status, 200)
    assert.equal(done.json.data.user.store.onboardingCompleted, true)

    // Same request without the double-submit header must be refused.
    const noCsrf = await call('/api/auth/onboarding/complete', {
      method: 'POST',
      token,
      jar,
      body: { store: { name: 'Sharma Provision Store' } },
    })
    assert.equal(noCsrf.status, 403)
  })

  test('rate-limits repeated sign-in attempts', async () => {
    __resetBuckets()
    let sawLimit = false
    for (let i = 0; i < 13; i++) {
      const res = await call('/api/auth/login', {
        method: 'POST',
        body: { identifier: 'ratelimit@example.com', password: 'grovio1234' },
      })
      if (res.status === 429) sawLimit = true
    }
    assert.equal(sawLimit, true, 'expected a 429 after exceeding the login limit')
  })
})
