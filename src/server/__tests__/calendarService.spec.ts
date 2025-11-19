import { describe, expect, beforeAll, afterAll, afterEach, it } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'

let memoryServer: MongoMemoryServer

let connectToDatabase: () => Promise<typeof import('mongoose')>
let disconnectFromDatabase: () => Promise<void>
let createCalendar: typeof import('../services/calendarService.js').createCalendar
let shiftScheduledItems: typeof import('../services/calendarService.js').shiftScheduledItems
let getCalendarById: typeof import('../services/calendarService.js').getCalendarById
let updateCalendar: typeof import('../services/calendarService.js').updateCalendar
let updateExceptions: typeof import('../services/calendarService.js').updateExceptions
let splitScheduledItem: typeof import('../services/calendarService.js').splitScheduledItem
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
    updateCalendar,
    updateExceptions,
    splitScheduledItem,
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
          kind: 'standard',
          templateConfig: { mode: 'generated', itemCount: 10, titlePattern: 'Ref {n}' },
        },
        {
          key: 'progress-a',
          name: 'Progress A',
          chainBehavior: 'linked',
          kind: 'standard',
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
          kind: 'standard',
          templateConfig: { mode: 'generated', itemCount: 5, titlePattern: 'Ref {n}' },
        },
        {
          key: 'progress-b',
          name: 'Progress B',
          chainBehavior: 'linked',
          kind: 'standard',
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

describe('calendarService.createCalendar', () => {
  it('creates an empty calendar without a start date', async () => {
    const calendar = await createCalendar({
      name: 'Idea Backlog',
      includeWeekends: false,
      includeExceptions: false,
      layers: [],
    })

    expect(calendar.id).toBeTruthy()
    expect(calendar.startDate).toBeNull()
    expect(calendar.layers).toHaveLength(0)
    expect(calendar.scheduledItems).toHaveLength(0)
  })

  it('seeds initial exceptions and skips blocked dates when generating', async () => {
    const calendar = await createCalendar({
      name: 'Initial Exceptions',
      startDate: new Date('2025-08-04').toISOString(),
      includeWeekends: false,
      includeExceptions: true,
      layers: [
        {
          key: 'reference',
          name: 'Reference',
          chainBehavior: 'linked',
          kind: 'standard',
          templateConfig: { mode: 'generated', itemCount: 3, titlePattern: 'Ref {n}' },
        },
        {
          key: 'progress',
          name: 'Progress',
          chainBehavior: 'linked',
          kind: 'standard',
          templateConfig: { mode: 'generated', itemCount: 3, titlePattern: 'Prog {n}' },
        },
        {
          key: 'exceptions',
          name: 'Exceptions',
          kind: 'exception',
          chainBehavior: 'independent',
          templateConfig: { mode: 'manual' },
        },
      ],
      initialExceptions: [
        { date: '2025-08-05', title: 'Global Day Off' },
        { date: '2025-08-06', title: 'Progress Pause', targetLayerKeys: ['progress'] },
      ],
    })

    const referenceItems = calendar.scheduledItems
      .filter((item) => item.layerKey === 'reference')
      .sort((a, b) => a.sequenceIndex - b.sequenceIndex)
    const progressItems = calendar.scheduledItems
      .filter((item) => item.layerKey === 'progress')
      .sort((a, b) => a.sequenceIndex - b.sequenceIndex)
    const exceptionItems = calendar.scheduledItems.filter(
      (item) => item.layerKey === 'exceptions'
    )

    expect(exceptionItems).toHaveLength(2)
    expect(exceptionItems.map((item) => item.title)).toEqual([
      'Global Day Off',
      'Progress Pause',
    ])

    expect(new Date(referenceItems[1]!.date).toISOString().slice(0, 10)).toBe('2025-08-06')
    expect(new Date(progressItems[1]!.date).toISOString().slice(0, 10)).toBe('2025-08-07')
  })
})

describe('calendarService.updateCalendar', () => {
  it('adds a new layer when key is unknown', async () => {
    const calendar = await createCalendar({
      name: 'Layer Add Test',
      startDate: new Date('2025-08-04').toISOString(),
      includeWeekends: false,
      includeExceptions: false,
    })

    const updated = await updateCalendar(calendar.id, {
      layers: [
        {
          key: 'custom-track',
          name: 'Custom Track',
          color: '#22c55e',
          chainBehavior: 'independent',
        },
      ],
    })

    expect(updated).not.toBeNull()
    const customLayer = updated!.layers.find((layer) => layer.key === 'custom-track')
    expect(customLayer).toBeTruthy()
    expect(customLayer?.name).toBe('Custom Track')
  })
})

describe('calendarService.updateExceptions', () => {
  it('adds exception dates and reflows linked layers to skip them', async () => {
    const start = new Date('2025-08-04') // Monday
    const calendar = await createCalendar({
      name: 'Exceptions Reflow',
      startDate: start.toISOString(),
      includeWeekends: false,
      includeExceptions: true,
      layers: [
        {
          key: 'reference',
          name: 'Reference',
          chainBehavior: 'linked',
          kind: 'standard',
          templateConfig: { mode: 'generated', itemCount: 5, titlePattern: 'Ref {n}' },
        },
        {
          key: 'exceptions',
          name: 'Exceptions',
          chainBehavior: 'independent',
          kind: 'exception',
          templateConfig: { mode: 'manual' },
        },
      ],
    })

    // Grab the date of sequenceIndex 3
    const ref3 = calendar.scheduledItems.find(
      (i) => i.layerKey === 'reference' && i.sequenceIndex === 3
    )!
    const ref4 = calendar.scheduledItems.find(
      (i) => i.layerKey === 'reference' && i.sequenceIndex === 4
    )!
    expect(ref3).toBeDefined()
    expect(ref4).toBeDefined()

    // Add an exception exactly on the date of ref3
    const exceptionIso = new Date(ref3.date).toISOString().slice(0, 10)
    const after = await updateExceptions(calendar.id, {
      addEntries: [{ date: exceptionIso }],
    })
    expect(after).not.toBeNull()

    const refreshed = await getCalendarById(calendar.id)
    expect(refreshed).not.toBeNull()

    const newRef3 = refreshed!.scheduledItems.find(
      (i) => i.layerKey === 'reference' && i.sequenceIndex === 3
    )!
    const newRef4 = refreshed!.scheduledItems.find(
      (i) => i.layerKey === 'reference' && i.sequenceIndex === 4
    )!

    // The new ref3 should no longer be on the exception date
    expect(new Date(newRef3.date).toISOString().slice(0, 10)).not.toBe(exceptionIso)
    // And ordering should be preserved and dates should be >= previous
    expect(new Date(newRef3.date).getTime()).toBeGreaterThanOrEqual(
      new Date(ref3.date).getTime()
    )
    expect(new Date(newRef4.date).getTime()).toBeGreaterThan(
      new Date(newRef3.date).getTime()
    )
  })

  it('allows stacked events (multiple items on the same date within a layer)', async () => {
    const calendar = await createCalendar({
      name: 'Stacking Demo',
      startDate: new Date('2025-08-04').toISOString(),
      includeWeekends: false,
      includeExceptions: false,
      layers: [
        {
          key: 'reference',
          name: 'Reference',
          chainBehavior: 'linked',
          kind: 'standard',
          templateConfig: { mode: 'generated', itemCount: 5, titlePattern: 'Ref {n}' },
        },
      ],
    })

    const first = calendar.scheduledItems.find(
      (item) => item.layerKey === 'reference' && item.sequenceIndex === 1
    )
    const second = calendar.scheduledItems.find(
      (item) => item.layerKey === 'reference' && item.sequenceIndex === 2
    )
    expect(first).toBeDefined()
    expect(second).toBeDefined()

    const persisted = await CalendarModel.findById(calendar.id).exec()
    expect(persisted).not.toBeNull()
    const firstDate = new Date(first!.date)
    const stackedSecond = persisted!.scheduledItems.find(
      (item) => item.layerKey === 'reference' && item.sequenceIndex === 2
    )
    expect(stackedSecond).toBeDefined()
    stackedSecond!.date = firstDate
    persisted!.markModified('scheduledItems')
    await persisted!.save()

    const stackedCalendar = await getCalendarById(calendar.id)
    expect(stackedCalendar).not.toBeNull()
    const stackedEntries = stackedCalendar!.scheduledItems.filter(
      (item) =>
        item.layerKey === 'reference' &&
        new Date(item.date).toISOString() === firstDate.toISOString()
    )
    expect(stackedEntries).toHaveLength(2)
  })

  it('scopes exception entries to specific layers when targetLayerKeys is provided', async () => {
    const start = new Date('2025-08-04')
    const calendar = await createCalendar({
      name: 'Scoped Exceptions',
      startDate: start.toISOString(),
      includeWeekends: false,
      includeExceptions: true,
      layers: [
        {
          key: 'reference',
          name: 'Reference',
          chainBehavior: 'linked',
          kind: 'standard',
          templateConfig: { mode: 'generated', itemCount: 4, titlePattern: 'Ref {n}' },
        },
        {
          key: 'progress',
          name: 'Progress',
          chainBehavior: 'linked',
          kind: 'standard',
          templateConfig: { mode: 'generated', itemCount: 4, titlePattern: 'Prog {n}' },
        },
        {
          key: 'exceptions',
          name: 'Exceptions',
          chainBehavior: 'independent',
          kind: 'exception',
          templateConfig: { mode: 'manual' },
        },
      ],
    })

    const ref2 = calendar.scheduledItems.find(
      (i) => i.layerKey === 'reference' && i.sequenceIndex === 2
    )!
    const progress2 = calendar.scheduledItems.find(
      (i) => i.layerKey === 'progress' && i.sequenceIndex === 2
    )!
    const targetDate = new Date(progress2.date).toISOString().slice(0, 10)

    await updateExceptions(calendar.id, {
      addEntries: [{ date: targetDate, targetLayerKeys: ['progress'] }],
    })

    const refreshed = await getCalendarById(calendar.id)
    expect(refreshed).not.toBeNull()

    const updatedRef2 = refreshed!.scheduledItems.find(
      (i) => i.layerKey === 'reference' && i.sequenceIndex === 2
    )!
    const updatedProgress2 = refreshed!.scheduledItems.find(
      (i) => i.layerKey === 'progress' && i.sequenceIndex === 2
    )!

    expect(new Date(updatedRef2.date).toISOString().slice(0, 10)).toBe(
      new Date(ref2.date).toISOString().slice(0, 10)
    )
    expect(new Date(updatedProgress2.date).toISOString().slice(0, 10)).not.toBe(
      targetDate
    )
  })
})

describe('calendarService.splitScheduledItem', () => {
  it('splits an event into multiple parts and shifts subsequent items', async () => {
    const calendar = await createCalendar({
      name: 'Split Demo',
      startDate: new Date('2025-01-06').toISOString(), // Monday
      includeWeekends: false,
      includeExceptions: true,
      layers: [
        {
          key: 'reference',
          name: 'Reference',
          chainBehavior: 'linked',
          kind: 'standard',
          templateConfig: { mode: 'generated', itemCount: 4, titlePattern: 'Lesson {n}' },
        },
        {
          key: 'exceptions',
          name: 'Exceptions',
          chainBehavior: 'independent',
          kind: 'exception',
          templateConfig: { mode: 'manual' },
        },
      ],
    })

    const target = calendar.scheduledItems.find(
      (item) => item.layerKey === 'reference' && item.sequenceIndex === 2
    )
    expect(target).toBeDefined()

    const result = await splitScheduledItem(calendar.id, {
      scheduledItemId: target!.id,
      parts: 2,
    })
    expect(result).not.toBeNull()

    const refreshed = await getCalendarById(calendar.id)
    expect(refreshed).not.toBeNull()

    const layerItems = refreshed!.scheduledItems
      .filter((item) => item.layerKey === 'reference')
      .sort((a, b) => a.sequenceIndex - b.sequenceIndex)

    expect(layerItems).toHaveLength(5)

    const partItems = layerItems.filter((item) => item.splitGroupId)
    const part1 = partItems.find((item) => item.splitIndex === 1)!
    const part2 = partItems.find((item) => item.splitIndex === 2)!
    expect(part1.splitGroupId).toBe(part2.splitGroupId)
    expect(part1.splitTotal).toBe(2)
    expect(part1.title).toContain('(Part 1/2)')
    expect(part2.title).toContain('(Part 2/2)')

    const firstDate = new Date(part1.date).toISOString().slice(0, 10)
    const secondDate = new Date(part2.date).toISOString().slice(0, 10)
    expect(firstDate).not.toBe(secondDate)

    const thirdItem = layerItems.find((item) => item.sequenceIndex === 4)!
    const originalThird = calendar.scheduledItems.find(
      (item) => item.layerKey === 'reference' && item.sequenceIndex === 3
    )!
    expect(new Date(thirdItem.date).getTime()).toBeGreaterThan(
      new Date(originalThird.date).getTime()
    )
  })
})

