import { describe, expect, it } from 'vitest'

import { useScheduleAdjuster } from '../useScheduleAdjuster'
import type { Calendar } from '../../types/calendar'

const baseCalendar: Calendar = {
  id: 'cal-1',
  name: 'Sample Calendar',
  source: 'abeka',
  startDate: new Date('2025-08-04').toISOString(),
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
      date: new Date('2025-08-04').toISOString(),
      groupingKey: 'abeka',
      groupingSequence: 1,
      label: 'Abeka Day 1',
      notes: '',
      events: [],
    },
    {
      id: 'abeka-2',
      date: new Date('2025-08-05').toISOString(),
      groupingKey: 'abeka',
      groupingSequence: 2,
      label: 'Abeka Day 2',
      notes: '',
      events: [],
    },
    {
      id: 'student-2',
      date: new Date('2025-08-05').toISOString(),
      groupingKey: 'student-a',
      groupingSequence: 2,
      label: 'Student Day 2',
      notes: '',
      events: [],
    },
    {
      id: 'holiday-2',
      date: new Date('2025-08-05').toISOString(),
      groupingKey: 'holidays',
      groupingSequence: 2,
      label: 'Labor Day',
      notes: '',
      events: [],
    },
  ],
}

describe('useScheduleAdjuster', () => {
  it('shifts all auto-shift groupings by default', () => {
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

    expect(new Date(abekaDay!.date).toISOString()).toBe(
      new Date('2025-08-07').toISOString()
    )
    expect(new Date(studentDay!.date).toISOString()).toBe(
      new Date('2025-08-07').toISOString()
    )
    expect(new Date(holidayDay!.date).toISOString()).toBe(
      new Date('2025-08-05').toISOString()
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
      new Date('2025-08-04').toISOString()
    )
    expect(new Date(studentDay!.date).toISOString()).toBe(
      baseCalendar.days.find((day) => day.id === 'student-2')!.date
    )
  })
})

