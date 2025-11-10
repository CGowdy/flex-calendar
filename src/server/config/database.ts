import mongoose from 'mongoose'

import { env } from './env.js'

let isConnecting = false

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose
  }

  if (isConnecting) {
    await new Promise((resolve, reject) => {
      mongoose.connection.once('connected', resolve)
      mongoose.connection.once('error', reject)
    })
    return mongoose
  }

  isConnecting = true

  try {
    mongoose.set('strictQuery', true)
    await mongoose.connect(env.MONGODB_URI)
    mongoose.connection.on('error', (error) => {
      mongoose.connection.getClient().close().catch(() => undefined)
      throw error
    })
    return mongoose
  } finally {
    isConnecting = false
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
}

