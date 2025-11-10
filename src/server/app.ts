import cors from '@fastify/cors'
import sensible from '@fastify/sensible'
import fastify from 'fastify'
import type { FastifyInstance } from 'fastify'

import { env } from './config/env.js'
import { calendarsRoutes } from './routes/calendars.js'

export function buildServer(): FastifyInstance {
  const app = fastify({
    logger: true,
  })

  app.register(cors, {
    origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',') : true,
    credentials: true,
  })
  app.register(sensible)

  app.get('/health', async () => ({ status: 'ok' }))

  app.register(calendarsRoutes, {
    prefix: '/api/calendars',
  })

  return app
}

