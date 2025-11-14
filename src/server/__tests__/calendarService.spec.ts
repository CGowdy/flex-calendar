import { describe, expect, beforeAll, afterAll, afterEach, it } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'

let memoryServer: MongoMemoryServer

let connectToDatabase: () => Promise<typeof import('mongoose')>
let disconnectFromDatabase: () => Promise<void>
let createCalendar: typeof import('../services/calendarService.js').createCalendar
let shiftScheduledItems: typeof import('../services/calendarService.js').shiftScheduledItems
let getCalendarById: typeof import('../services/calendarService.js').getCalendarById
let CalendarModel: typeof import('../models/calendarModel.js').CalendarModel
import type { CalendarDTO } from '../types/calendar.js'

beforeAll(async () => {
  memoryServer = await MongoMemoryServer.create()
  process.env.MONGODB_URI = memoryServer.getUri()
  process.env.NODE_ENV = 'test'

  ;({ connectToDatabase, disconnectFromDatabase } = await import(
    '../config/database.js'
  ))
  ;({ CalendarModel } = await import('../models/calendarModel.js'))
  ;({
    createCalendar,
    shiftScheduledItems,
    getCalendarById,
  } = await import('../services/calendarService.js'))

  await connectToDatabase()
})

afterEach(async () => {
  await CalendarModel.deleteMany({})
})

afterAll(async () => {
  await disconnectFromDatabase()
  await memoryServer.stop()
})

describe('calendarService.shiftScheduledItems', () => {
  it('shifts downstream items for linked layers', async () => {
    const calendar = await createCalendar({
      name: 'Test Calendar',
      startDate: new Date('2025-08-04').toISOString(),
      includeWeekends: false,
      includeExceptions: false,
      layers: [
        {
          key: 'reference',
          name: 'Reference',
          chainBehavior: 'linked',
          templateConfig: { mode: 'generated', itemCount: 10, titlePattern: 'Ref {n}' },
        },
        {
          key: 'progress-a',
          name: 'Progress A',
          chainBehavior: 'linked',
          templateConfig: { mode: 'generated', itemCount: 10, titlePattern: 'Progress {n}' },
        },
        {
          key: 'exceptions',
          name: 'Exceptions',
          kind: 'exception',
          chainBehavior: 'independent',
          templateConfig: { mode: 'manual' },
        },
      ],
    })

    const itemToShift = calendar.scheduledItems.find(
      (item) => item.layerKey === 'reference' && item.sequenceIndex === 3
    )
    expect(itemToShift).toBeDefined()

    const referenceBefore = calendar.scheduledItems.find(
      (item) => item.layerKey === 'reference' && item.sequenceIndex === 3
    )!
    const progressBefore = calendar.scheduledItems.find(
      (item) => item.layerKey === 'progress-a' && item.sequenceIndex === 3
    )!

    const shiftBy = 2
    const updated = await shiftScheduledItems(calendar.id, {
      scheduledItemId: itemToShift!.id,
      shiftByDays: shiftBy,
    })

    expect(updated).not.toBeNull()

    const refreshed = await getCalendarById(calendar.id)
    expect(refreshed).not.toBeNull()

    const shiftedReference = refreshed!.scheduledItems.find(
      (item: CalendarDTO['scheduledItems'][number]) =>
        item.layerKey === 'reference' && item.sequenceIndex === 3
    )
    expect(shiftedReference).toBeDefined()
    const originalDate = new Date(referenceBefore.date).getTime()
    expect(new Date(shiftedReference!.date).getTime()).toBe(
      originalDate + 1000 * 60 * 60 * 24 * shiftBy
    )

    const shiftedProgress = refreshed!.scheduledItems.find(
      (item: CalendarDTO['scheduledItems'][number]) =>
        item.layerKey === 'progress-a' && item.sequenceIndex === 3
    )
    expect(shiftedProgress).toBeDefined()
    expect(new Date(shiftedProgress!.date).getTime()).toBeGreaterThan(
      new Date(progressBefore.date).getTime()
    )
  })

  it('limits shifts to explicit layer keys', async () => {
    const calendar = await createCalendar({
      name: 'Partial Shift',
      startDate: new Date('2025-08-04').toISOString(),
      includeWeekends: false,
      includeExceptions: false,
      layers: [
        {
          key: 'reference',
          name: 'Reference',
          chainBehavior: 'linked',
          templateConfig: { mode: 'generated', itemCount: 5, titlePattern: 'Ref {n}' },
        },
        {
          key: 'progress-b',
          name: 'Progress B',
          chainBehavior: 'linked',
          templateConfig: { mode: 'generated', itemCount: 5, titlePattern: 'Progress {n}' },
        },
      ],
    })

    const itemToShift = calendar.scheduledItems.find(
      (item) => item.layerKey === 'reference' && item.sequenceIndex === 2
    )
    expect(itemToShift).toBeDefined()

    const progressBefore = calendar.scheduledItems.find(
      (item) => item.layerKey === 'progress-b' && item.sequenceIndex === 2
    )
    expect(progressBefore).toBeDefined()

    await shiftScheduledItems(calendar.id, {
      scheduledItemId: itemToShift!.id,
      shiftByDays: 1,
      layerKeys: ['reference'],
    })

    const refreshed = await getCalendarById(calendar.id)
    expect(refreshed).not.toBeNull()

    const updatedProgress = refreshed!.scheduledItems.find(
      (item: CalendarDTO['scheduledItems'][number]) =>
        item.layerKey === 'progress-b' && item.sequenceIndex === 2
    )
    expect(updatedProgress).toBeDefined()
    expect(new Date(updatedProgress!.date).toISOString()).toBe(
      new Date(progressBefore!.date).toISOString()
    )
  })
})

