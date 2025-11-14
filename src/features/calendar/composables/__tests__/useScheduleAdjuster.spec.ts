import { describe, expect, it } from 'vitest'

import { useScheduleAdjuster } from '../useScheduleAdjuster'
import type { Calendar } from '../../types/calendar'

const toUtcIso = (date: string) => new Date(`${date}T00:00:00.000Z`).toISOString()

const baseCalendar: Calendar = {
  id: 'cal-1',
  name: 'Sample Calendar',
  source: 'abeka',
  startDate: toUtcIso('2025-08-04'),
  totalDays: 4,
  includeWeekends: false,
  includeHolidays: false,
  groupings: [
    {
      key: 'abeka',
      name: 'Abeka',
      color: '#2563eb',
      description: '',
      autoShift: true,
    },
    {
      key: 'student-a',
      name: 'Student A',
      color: '#059669',
      description: '',
      autoShift: true,
    },
    {
      key: 'holidays',
      name: 'Holidays',
      color: '#f97316',
      description: '',
      autoShift: false,
    },
  ],
  days: [
    {
      id: 'abeka-1',
      date: toUtcIso('2025-08-04'),
      groupingKey: 'abeka',
      groupingSequence: 1,
      label: 'Abeka Day 1',
      notes: '',
      events: [],
    },
    {
      id: 'abeka-2',
      date: toUtcIso('2025-08-05'),
      groupingKey: 'abeka',
      groupingSequence: 2,
      label: 'Abeka Day 2',
      notes: '',
      events: [],
    },
    {
      id: 'student-2',
      date: toUtcIso('2025-08-05'),
      groupingKey: 'student-a',
      groupingSequence: 2,
      label: 'Student Day 2',
      notes: '',
      events: [],
    },
    {
      id: 'holiday-2',
      date: toUtcIso('2025-08-05'),
      groupingKey: 'holidays',
      groupingSequence: 2,
      label: 'Labor Day',
      notes: '',
      events: [],
    },
  ],
}

describe('useScheduleAdjuster', () => {
  it('shifts all auto-shift groupings by default, skipping weekends and holidays', () => {
    const adjuster = useScheduleAdjuster()
    const shifted = adjuster.shiftCalendarDaysLocally(baseCalendar, {
      dayId: 'abeka-2',
      shiftByDays: 2,
    })

    const abekaDay = shifted.days.find((day) => day.id === 'abeka-2')
    const studentDay = shifted.days.find((day) => day.id === 'student-2')
    const holidayDay = shifted.days.find((day) => day.id === 'holiday-2')

    expect(abekaDay).toBeDefined()
    expect(studentDay).toBeDefined()
    expect(holidayDay).toBeDefined()

    // abeka-2 starts on Aug 5 (Tuesday), +2 days = Aug 7 (Thursday)
    // Smart reflow validates and keeps Aug 7 (valid weekday, no holiday)
    expect(new Date(abekaDay!.date).toISOString()).toBe(
      new Date('2025-08-07T00:00:00.000Z').toISOString()
    )

    // student-2 (sequence 2) should be reflowed to the day after abeka-2
    // Aug 7 + 1 = Aug 8 (Friday) - valid weekday
    expect(new Date(studentDay!.date).toISOString()).toBe(
      new Date('2025-08-08T00:00:00.000Z').toISOString()
    )

    // Holiday days should not shift (autoShift: false)
    expect(new Date(holidayDay!.date).toISOString()).toBe(
      new Date('2025-08-05T00:00:00.000Z').toISOString()
    )
  })

  it('limits shifts when grouping keys are provided', () => {
    const adjuster = useScheduleAdjuster()
    const shifted = adjuster.shiftCalendarDaysLocally(baseCalendar, {
      dayId: 'abeka-2',
      shiftByDays: -1,
      groupingKeys: ['abeka'],
    })

    const abekaDay = shifted.days.find((day) => day.id === 'abeka-2')
    const studentDay = shifted.days.find((day) => day.id === 'student-2')

    expect(new Date(abekaDay!.date).toISOString()).toBe(
      new Date('2025-08-04T00:00:00.000Z').toISOString()
    )
    expect(new Date(studentDay!.date).toISOString()).toBe(
      baseCalendar.days.find((day) => day.id === 'student-2')!.date
    )
  })

  it('always updates the target day even when sequences tie across groupings', () => {
    const adjuster = useScheduleAdjuster()
    const calendar = JSON.parse(JSON.stringify(baseCalendar)) as Calendar

    // Force student grouping day to appear before abeka day while sharing same sequence
    const studentDay = calendar.days.find((day) => day.id === 'student-2')!
    const abekaDay = calendar.days.find((day) => day.id === 'abeka-2')!
    calendar.days = [
      calendar.days[0]!,
      studentDay,
      abekaDay,
      calendar.days.find((day) => day.id === 'holiday-2')!,
    ]

    const shifted = adjuster.shiftCalendarDaysLocally(calendar, {
      dayId: 'abeka-2',
      shiftByDays: 1,
    })

    const updatedAbeka = shifted.days.find((day) => day.id === 'abeka-2')
    const updatedStudent = shifted.days.find((day) => day.id === 'student-2')

    expect(updatedAbeka).toBeDefined()
    expect(updatedStudent).toBeDefined()
    expect(new Date(updatedAbeka!.date).toISOString()).toBe(
      new Date('2025-08-06T00:00:00.000Z').toISOString()
    )
    expect(new Date(updatedStudent!.date).toISOString()).toBe(
      new Date('2025-08-07T00:00:00.000Z').toISOString()
    )
  })

  it('preserves downstream gaps when earlier days move', () => {
    const adjuster = useScheduleAdjuster()
    let calendar = JSON.parse(JSON.stringify(baseCalendar)) as Calendar

    // First, move Day 2 forward by 2 valid school days (creates a gap)
    calendar = adjuster.shiftCalendarDaysLocally(calendar, {
      dayId: 'abeka-2',
      shiftByDays: 2,
    })

    const day1AfterFirstShift = calendar.days.find((day) => day.id === 'abeka-1')!
    const day2AfterFirstShift = calendar.days.find((day) => day.id === 'abeka-2')!
    const initialGapMs =
      new Date(day2AfterFirstShift.date).getTime() -
      new Date(day1AfterFirstShift.date).getTime()

    // Now move Day 1 backward by 1 day; gap should remain identical
    const shiftedAgain = adjuster.shiftCalendarDaysLocally(calendar, {
      dayId: 'abeka-1',
      shiftByDays: -1,
    })

    const day1AfterSecondShift = shiftedAgain.days.find(
      (day) => day.id === 'abeka-1'
    )!
    const day2AfterSecondShift = shiftedAgain.days.find(
      (day) => day.id === 'abeka-2'
    )!
    const finalGapMs =
      new Date(day2AfterSecondShift.date).getTime() -
      new Date(day1AfterSecondShift.date).getTime()

    expect(finalGapMs).toBe(initialGapMs)
  })
})

