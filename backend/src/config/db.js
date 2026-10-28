import mongoose from 'mongoose'
import { env } from './env.js'

export async function connectDB() {
  await mongoose.connect(env.mongoUri)
  console.log(`MongoDB connected (${mongoose.connection.name})`)
  return mongoose.connection
}

export async function disconnectDB() {
  await mongoose.disconnect()
}
