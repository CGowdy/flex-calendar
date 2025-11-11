import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import {
  calendarIdParamsSchema,
  createCalendarSchema,
  shiftCalendarDaysSchema,
  updateCalendarSchema,
} from '../schemas/calendarSchemas.js'
import {
  createCalendar,
  getCalendarById,
  listCalendars,
  shiftCalendarDays,
  updateCalendar,
} from '../services/calendarService.js'

export async function calendarsRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    return listCalendars()
  })

  app.get('/:calendarId', async (request) => {
    const { calendarId } = calendarIdParamsSchema.parse(request.params)
    const calendar = await getCalendarById(calendarId)
    if (!calendar) {
      throw app.httpErrors.notFound('Calendar not found')
    }
    return calendar
  })

  app.post('/', async (request, reply) => {
    const payload = createCalendarSchema.parse(request.body)
    const calendar = await createCalendar(payload)
    reply.code(201)
    return calendar
  })

  app.patch('/:calendarId', async (request) => {
    const { calendarId } = calendarIdParamsSchema.parse(request.params)
    const body = updateCalendarSchema.parse(request.body)
    const calendar = await updateCalendar(calendarId, body)
    if (!calendar) {
      throw app.httpErrors.notFound('Calendar not found')
    }
    return calendar
  })

  app.post('/:calendarId/shift', async (request) => {
    const params = calendarIdParamsSchema.parse(request.params)
    const body = shiftCalendarDaysSchema.parse(request.body)

    const calendar = await shiftCalendarDays(params.calendarId, body)
    if (!calendar) {
      throw app.httpErrors.notFound('Calendar or day not found')
    }

    return calendar
  })

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ message: 'Route not found' })
  })

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError) {
      reply.status(400).send({
        message: 'Validation error',
        issues: error.issues,
      })
      return
    }

    const statusCode =
      typeof (error as { statusCode?: number }).statusCode === 'number'
        ? (error as { statusCode?: number }).statusCode!
        : 500

    const message =
      typeof (error as Error).message === 'string'
        ? (error as Error).message
        : 'Unexpected error'

    app.log.error({ err: error }, 'Unhandled error')
    reply.status(statusCode).send({ message })
  })
}

