import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import { env } from './config/env.js'
import healthRoutes from './routes/health.js'
import authRoutes from './routes/auth.js'
import catalogRoutes from './routes/catalog.js'
import inventoryRoutes from './routes/inventory.js'
import supplierRoutes from './routes/suppliers.js'
import purchaseRoutes from './routes/purchases.js'
import billRoutes from './routes/bills.js'
import returnRoutes from './routes/returns.js'
import paymentRoutes from './routes/payments.js'
import customerRoutes from './routes/customers.js'
import storeSettingsRoutes from './routes/storeSettings.js'
import teamRoutes from './routes/team.js'
import analyticsRoutes from './routes/analytics.js'
import backupRoutes from './routes/backup.js'
import futureLabRoutes from './routes/futureLab.js'
import securityHeaders from './middleware/securityHeaders.js'
import { fail } from './lib/http-error.js'

const app = express()

// Behind Render/Heroku/etc. so req.ip and secure-cookie trust are correct.
app.set('trust proxy', 1)

app.use(securityHeaders)

// Allow only the configured frontend origin(s) and, crucially, credentials.
const allowedOrigins = env.clientOrigin
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header (same-origin/curl/health checks) is allowed.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
      return callback(new Error(`Origin not allowed: ${origin}`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['X-CSRF-Token'],
  }),
)

// Request-size limit guards against oversized-payload abuse.
// The backup restore endpoint needs a larger, explicitly bounded body, so it is
// carved out before the default parser runs (backup.js installs its own).
const jsonBody = express.json({ limit: '16kb' })
app.use((req, _res, next) => {
  if (req.path === '/api/backup/restore') return next()
  return jsonBody(req, _res, next)
})
app.use(express.urlencoded({ extended: false, limit: '16kb' }))

app.get('/api/health', (_req, res) => {
  const dbHealthy = mongoose.connection.readyState === 1
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'ok' : 'degraded',
    service: 'grovio-api',
    database: dbHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  })
})
app.use('/api/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api', catalogRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/suppliers', supplierRoutes)
app.use('/api/purchases', purchaseRoutes)
app.use('/api/bills', billRoutes)
app.use('/api/returns', returnRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/store-settings', storeSettingsRoutes)
app.use('/api/team', teamRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/backup', backupRoutes)
app.use('/api/future-lab', futureLabRoutes)

// CORS rejections surface as normalised JSON errors.
app.use((err, _req, res, next) => {
  if (err?.message?.startsWith('Origin not allowed')) {
    return res.status(403).json({ success: false, message: 'Origin not allowed.' })
  }
  return next(err)
})

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Resource not found.' })
})

// Final error handler: never leak stack traces or internal details to clients.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (!err?.status) {
    // Unexpected errors are logged server-side only.
    console.error('[error]', err?.message || err)
  }
  fail(res, err)
})

export default app
