import { MongoMemoryServer } from 'mongodb-memory-server'
import type { FastifyInstance } from 'fastify'

let memoryServer: MongoMemoryServer
let apiServer: FastifyInstance

async function globalSetup() {
  console.log('[E2E Global Setup] Starting in-memory MongoDB...')
  memoryServer = await MongoMemoryServer.create()
  const mongoUri = memoryServer.getUri()

  // Set env for API server
  process.env.MONGODB_URI = mongoUri
  process.env.NODE_ENV = 'test'
  process.env.PORT = '3334'
  process.env.HOST = '127.0.0.1'
  process.env.CORS_ORIGIN = 'http://localhost:5174'

  console.log('[E2E Global Setup] Connecting to database...')
  const { connectToDatabase } = await import('../../src/server/config/database.js')
  await connectToDatabase()

  console.log('[E2E Global Setup] Starting API server...')
  const { buildServer } = await import('../../src/server/app.js')
  apiServer = buildServer()

  const address = await apiServer.listen({
    port: 3334,
    host: '127.0.0.1',
  })
  console.log(`[E2E Global Setup] API server started at ${address}`)

  // Store references for teardown
  ;(global as any).__E2E_MEMORY_SERVER__ = memoryServer
  ;(global as any).__E2E_API_SERVER__ = apiServer
}

export default globalSetup

