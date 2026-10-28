import 'dotenv/config'
import app from './app.js'
import { env, requireEnv } from './config/env.js'
import { connectDB, disconnectDB } from './config/db.js'

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason instanceof Error ? reason.message : String(reason))
  process.exit(1)
})

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err.message)
  process.exit(1)
})

requireEnv()

const PORT = env.port

let server

connectDB()
  .then(() => {
    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Grovio API running on http://0.0.0.0:${PORT} (${env.nodeEnv})`)
    })
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message)
    process.exit(1)
  })

const shutdown = async () => {
  if (server) server.close(() => process.exit(0))
  await disconnectDB().catch(() => {})
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
