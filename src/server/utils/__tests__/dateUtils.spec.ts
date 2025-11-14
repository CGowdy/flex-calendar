import { describe, expect, it, vi } from 'vitest'

import {
  addDays,
  addValidSchoolDays,
  countValidDaySpan,
  generateValidSchoolDates,
  isWeekend,
} from '../dateUtils'

describe('dateUtils', () => {
  it('adds days using UTC setters/getters to avoid tz drift', () => {
    const setUTCDateSpy = vi.spyOn(Date.prototype, 'setUTCDate')
    const getUTCDateSpy = vi.spyOn(Date.prototype, 'getUTCDate')
    const setDateSpy = vi.spyOn(Date.prototype, 'setDate')

    const result = addDays(new Date('2025-08-01T00:00:00.000Z'), 2)

    expect(result.toISOString()).toBe('2025-08-03T00:00:00.000Z')
    expect(setUTCDateSpy).toHaveBeenCalled()
    expect(getUTCDateSpy).toHaveBeenCalled()
    expect(setDateSpy).not.toHaveBeenCalled()

    setUTCDateSpy.mockRestore()
    getUTCDateSpy.mockRestore()
    setDateSpy.mockRestore()
  })

  it('classifies weekends using UTC day values', () => {
    const getUTCDay = vi.fn().mockReturnValue(1) // Monday
    const fakeDate = {
      getUTCDay,
    } as unknown as Date

    expect(isWeekend(fakeDate)).toBe(false)
    expect(getUTCDay).toHaveBeenCalled()
  })

  it('skips UTC weekends when generating school dates', () => {
    const startOnFriday = new Date('2025-08-01T00:00:00.000Z') // Friday
    const dates = generateValidSchoolDates(startOnFriday, 4, false)

    expect(dates.map((d) => d.toISOString())).toEqual([
      '2025-08-01T00:00:00.000Z', // Fri
      '2025-08-04T00:00:00.000Z', // Mon
      '2025-08-05T00:00:00.000Z', // Tue
      '2025-08-06T00:00:00.000Z', // Wed
    ])
  })

  it('counts valid school-day spans between two dates', () => {
    const span = countValidDaySpan(
      new Date('2025-08-01T00:00:00.000Z'), // Friday
      new Date('2025-08-06T00:00:00.000Z'), // Wednesday
      false
    )
    expect(span).toBe(3)

    const reversedSpan = countValidDaySpan(
      new Date('2025-08-06T00:00:00.000Z'),
      new Date('2025-08-01T00:00:00.000Z'),
      false
    )
    expect(reversedSpan).toBe(3)
  })

  it('adds valid school days while skipping weekends/holidays', () => {
    const holidaySet = new Set<string>(['2025-08-05'])
    const result = addValidSchoolDays(
      new Date('2025-08-01T00:00:00.000Z'),
      2,
      false,
      holidaySet
    )
    // Adds Mon (Aug 4) as step 1, skips holiday Aug 5, lands on Aug 6
    expect(result.toISOString()).toBe('2025-08-06T00:00:00.000Z')
  })
})

