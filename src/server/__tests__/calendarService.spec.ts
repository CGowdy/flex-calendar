import { describe, expect, beforeAll, afterAll, afterEach, it } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'

let memoryServer: MongoMemoryServer

let connectToDatabase: () => Promise<typeof import('mongoose')>
let disconnectFromDatabase: () => Promise<void>
let createCalendar: typeof import('../services/calendarService.js').createCalendar
let shiftCalendarDays: typeof import('../services/calendarService.js').shiftCalendarDays
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
    shiftCalendarDays,
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

describe('calendarService.shiftCalendarDays', () => {
  it('shifts downstream days for auto-shift groupings', async () => {
    const calendar = await createCalendar({
      name: 'Test Calendar',
      source: 'abeka',
      startDate: new Date('2025-08-04').toISOString(),
      totalDays: 10,
      includeWeekends: false,
      includeHolidays: false,
      groupings: [
        { key: 'abeka', name: 'Abeka', autoShift: true },
        { key: 'student-a', name: 'Student A', autoShift: true },
        { key: 'holidays', name: 'Holidays', autoShift: false },
      ],
    })

    const dayToShift = calendar.days.find(
      (day) => day.groupingKey === 'abeka' && day.groupingSequence === 3
    )
    expect(dayToShift).toBeDefined()

    const originalDate = new Date(dayToShift!.date).getTime()

    const updated = await shiftCalendarDays(calendar.id, {
      dayId: dayToShift!.id,
      shiftByDays: 2,
    })

    expect(updated).not.toBeNull()

    const refreshed = await getCalendarById(calendar.id)
    expect(refreshed).not.toBeNull()

    const shiftedAbekaDay = refreshed!.days.find(
      (day: CalendarDTO['days'][number]) => day.groupingKey === 'abeka' && day.groupingSequence === 3
    )
    expect(shiftedAbekaDay).toBeDefined()
    expect(new Date(shiftedAbekaDay!.date).getTime()).toBe(
      originalDate + 1000 * 60 * 60 * 24 * 2
    )

    const shiftedStudentDay = refreshed!.days.find(
      (day: CalendarDTO['days'][number]) => day.groupingKey === 'student-a' && day.groupingSequence === 3
    )
    expect(shiftedStudentDay).toBeDefined()
    expect(new Date(shiftedStudentDay!.date).getTime()).toBe(
      new Date(calendar.days.find((day) => day.id === shiftedStudentDay!.id)!.date).getTime() +
        1000 * 60 * 60 * 24 * 2
    )

    const holidayDay = refreshed!.days.find(
      (day: CalendarDTO['days'][number]) => day.groupingKey === 'holidays' && day.groupingSequence === 3
    )
    if (holidayDay) {
      const originalHoliday = calendar.days.find(
        (day) => day.id === holidayDay.id
      )
      expect(originalHoliday).toBeDefined()
      expect(new Date(holidayDay.date).getTime()).toBe(
        new Date(originalHoliday!.date).getTime()
      )
    }
  })

  it('limits shifts to explicit grouping keys', async () => {
    const calendar = await createCalendar({
      name: 'Partial Shift',
      source: 'custom',
      startDate: new Date('2025-08-04').toISOString(),
      totalDays: 5,
      includeWeekends: false,
      includeHolidays: false,
      groupings: [
        { key: 'abeka', name: 'Abeka', autoShift: true },
        { key: 'student-b', name: 'Student B', autoShift: true },
      ],
    })

    const dayToShift = calendar.days.find(
      (day: CalendarDTO['days'][number]) => day.groupingKey === 'abeka' && day.groupingSequence === 2
    )
    expect(dayToShift).toBeDefined()

    const studentDayBefore = calendar.days.find(
      (day: CalendarDTO['days'][number]) => day.groupingKey === 'student-b' && day.groupingSequence === 2
    )

    await shiftCalendarDays(calendar.id, {
      dayId: dayToShift!.id,
      shiftByDays: 1,
      groupingKeys: ['abeka'],
    })

    const refreshed = await getCalendarById(calendar.id)
    expect(refreshed).not.toBeNull()

    const updatedStudentDay = refreshed!.days.find(
      (day: CalendarDTO['days'][number]) => day.groupingKey === 'student-b' && day.groupingSequence === 2
    )
    expect(updatedStudentDay).toBeDefined()
    expect(new Date(updatedStudentDay!.date).toISOString()).toBe(
      new Date(studentDayBefore!.date).toISOString()
    )
  })
})

