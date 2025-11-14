import type {
  Calendar,
  CalendarDay,
  CalendarGrouping,
  ShiftCalendarDaysRequest,
} from '../types/calendar'

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay()
  return day === 0 || day === 6
}

function normalizeDate(date: Date): string {
  const d = new Date(date)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function getHolidayDates(days: CalendarDay[]): Set<string> {
  const holidaySet = new Set<string>()
  for (const day of days) {
    if (day.groupingKey === 'holidays') {
      holidaySet.add(normalizeDate(new Date(day.date)))
    }
  }
  return holidaySet
}

function countValidDaySpan(
  startDate: Date,
  endDate: Date,
  includeWeekends: boolean,
  holidayDates?: Set<string>
): number {
  const startTime = startDate.getTime()
  const endTime = endDate.getTime()

  if (startTime === endTime) {
    return 0
  }

  const [earlier, later] =
    startTime <= endTime ? [startDate, endDate] : [endDate, startDate]

  const targetKey = normalizeDate(later)
  if (normalizeDate(earlier) === targetKey) {
    return 0
  }

  let steps = 0
  let cursor = addDays(earlier, 1)
  let guard = 0

  while (guard < 2000) {
    const next = nextSchoolDate(cursor, includeWeekends, holidayDates)
    steps += 1
    if (normalizeDate(next) === targetKey) {
      return steps
    }
    cursor = addDays(next, 1)
    guard += 1
  }

  return steps
}

function addValidSchoolDays(
  date: Date,
  steps: number,
  includeWeekends: boolean,
  holidayDates?: Set<string>
): Date {
  if (steps <= 0) {
    return new Date(date)
  }

  let result = new Date(date)
  let cursor = addDays(result, 1)

  for (let i = 0; i < steps; i++) {
    result = nextSchoolDate(cursor, includeWeekends, holidayDates)
    cursor = addDays(result, 1)
  }

  return result
}

function nextSchoolDate(
  currentDate: Date,
  includeWeekends: boolean,
  holidayDates?: Set<string>
): Date {
  let candidate = new Date(currentDate)

  if (includeWeekends && (!holidayDates || holidayDates.size === 0)) {
    return candidate
  }

  while (true) {
    if (!includeWeekends && isWeekend(candidate)) {
      candidate = addDays(candidate, 1)
      continue
    }

    if (holidayDates && holidayDates.has(normalizeDate(candidate))) {
      candidate = addDays(candidate, 1)
      continue
    }

    break
  }

  return candidate
}

function toEffectiveGroupingKeys(
  calendar: Calendar,
  explicitKeys?: string[]
): Set<string> {
  if (explicitKeys && explicitKeys.length > 0) {
    return new Set(explicitKeys)
  }

  return new Set(
    calendar.groupings
      .filter((grouping) => grouping.autoShift)
      .map((grouping) => grouping.key)
  )
}

export function useScheduleAdjuster() {
  function shiftCalendarDaysLocally(
    calendar: Calendar,
    payload: ShiftCalendarDaysRequest
  ): Calendar {
    const workingCopy = JSON.parse(JSON.stringify(calendar)) as Calendar

    if (payload.shiftByDays === 0) {
      return workingCopy
    }

    const targetDay = workingCopy.days.find((day) => day.id === payload.dayId)
    if (!targetDay) {
      return workingCopy
    }

    const effectiveGroupingKeys = toEffectiveGroupingKeys(
      workingCopy,
      payload.groupingKeys
    )

    // Get holiday dates for exclusion
    const holidayDates = getHolidayDates(workingCopy.days)

    // Calculate new date for target day (raw delta shift)
    const rawNewDate = addDays(new Date(targetDay.date), payload.shiftByDays)

    // Validate and adjust target date to next valid school date
    const newTargetDate = nextSchoolDate(
      rawNewDate,
      workingCopy.includeWeekends,
      holidayDates
    )

    // Find starting sequence for reflow
    const startingSequence = targetDay.groupingSequence

    // Get all days that need to be reflowed, sorted by sequence
    const daysToReflow = workingCopy.days
      .filter(
        (day) =>
          effectiveGroupingKeys.has(day.groupingKey) &&
          day.groupingSequence >= startingSequence
      )
      .sort((a, b) => a.groupingSequence - b.groupingSequence)

    if (daysToReflow.length === 0) {
      // No days to reflow, just update target day
      const updatedDays = workingCopy.days.map((day) =>
        day.id === targetDay.id
          ? { ...day, date: newTargetDate.toISOString() }
          : day
      )
      return { ...workingCopy, days: updatedDays }
    }

    // Ensure target day is first (sequence ties)
    const targetIndex = daysToReflow.findIndex((day) => day.id === targetDay.id)
    if (targetIndex === -1) {
      const updatedDays = workingCopy.days.map((day) =>
        day.id === targetDay.id
          ? { ...day, date: newTargetDate.toISOString() }
          : day
      )
      return { ...workingCopy, days: updatedDays }
    }
    if (targetIndex > 0) {
      const [targetInList] = daysToReflow.splice(targetIndex, 1)
      if (targetInList) {
        daysToReflow.unshift(targetInList)
      }
    }

    // Capture valid-day gaps between consecutive days (after target reordering)
    const gapSpans: number[] = []
    for (let i = 0; i < daysToReflow.length - 1; i++) {
      const current = new Date(daysToReflow[i]!.date)
      const next = new Date(daysToReflow[i + 1]!.date)
      const span = countValidDaySpan(
        current,
        next,
        workingCopy.includeWeekends,
        holidayDates
      )
      gapSpans.push(span > 0 ? span : 1)
    }

    // Set target day's new date (first in reflow list)
    const firstDay = daysToReflow[0]!
    const updatedFirstDay = {
      ...firstDay,
      date: newTargetDate.toISOString(),
    }

    // Generate valid dates for remaining days
    const remainingDays = daysToReflow.slice(1)

    // Create updated days map
    const updatedDaysMap = new Map<string, CalendarDay>()
    for (const day of workingCopy.days) {
      updatedDaysMap.set(day.id, day)
    }

    // Update first day
    updatedDaysMap.set(updatedFirstDay.id, updatedFirstDay)

    // Update remaining days, preserving prior gaps
    let previousDate = newTargetDate
    for (let i = 0; i < remainingDays.length; i++) {
      const day = remainingDays[i]!
      const span = gapSpans[i] ?? 1
      const nextDate = addValidSchoolDays(
        previousDate,
        span,
        workingCopy.includeWeekends,
        holidayDates
      )
      updatedDaysMap.set(day.id, {
        ...day,
        date: nextDate.toISOString(),
      })
      previousDate = nextDate
    }

    return {
      ...workingCopy,
      days: Array.from(updatedDaysMap.values()),
    }
  }

  function groupingOptions(calendar: Calendar): Array<{
    key: string
    label: string
    autoShift: boolean
  }> {
    return calendar.groupings.map((grouping: CalendarGrouping) => ({
      key: grouping.key,
      label: grouping.name,
      autoShift: grouping.autoShift,
    }))
  }

  return {
    shiftCalendarDaysLocally,
    groupingOptions,
  }
}

