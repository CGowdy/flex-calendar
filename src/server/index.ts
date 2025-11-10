import { buildServer } from './app.js'
import {
  connectToDatabase,
  disconnectFromDatabase,
} from './config/database.js'
import { env } from './config/env.js'

async function start() {
  try {
    await connectToDatabase()
    const app = buildServer()

    const address = await app.listen({
      port: env.PORT,
      host: env.HOST,
    })

    app.log.info(`API server listening on ${address}`)

    const shutdown = async (signal: NodeJS.Signals) => {
      app.log.info({ signal }, 'Shutting down server')
      await app.close()
      await disconnectFromDatabase()
      process.exit(0)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  } catch (error) {
    console.error('Failed to start server', error)
    process.exit(1)
  }
}

start()

