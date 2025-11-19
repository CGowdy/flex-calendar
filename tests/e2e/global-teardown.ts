import type { FastifyInstance } from 'fastify'
import type { MongoMemoryServer } from 'mongodb-memory-server'

declare global {

  var __E2E_API_SERVER__: FastifyInstance | undefined

  var __E2E_MEMORY_SERVER__: MongoMemoryServer | undefined
}

async function globalTeardown() {
  console.log('[E2E Global Teardown] Shutting down...')

  const apiServer = global.__E2E_API_SERVER__
  const memoryServer = global.__E2E_MEMORY_SERVER__

  if (apiServer) {
    console.log('[E2E Global Teardown] Closing API server...')
    await apiServer.close()
  }

  if (memoryServer) {
    console.log('[E2E Global Teardown] Stopping MongoDB...')
    await memoryServer.stop()
  }

  console.log('[E2E Global Teardown] Complete')
}

export default globalTeardown

