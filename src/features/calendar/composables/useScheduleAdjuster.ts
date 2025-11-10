import type {
  Calendar,
  CalendarDay,
  CalendarGrouping,
  ShiftCalendarDaysRequest,
} from '../types/calendar'

function addDaysToIso(dateIso: string, delta: number): string {
  const nextDate = new Date(dateIso)
  nextDate.setDate(nextDate.getDate() + delta)
  return nextDate.toISOString()
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
    const workingCopy = structuredClone(calendar) as Calendar

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

    const updatedDays = workingCopy.days.map<CalendarDay>((day) => {
      if (
        effectiveGroupingKeys.has(day.groupingKey) &&
        day.groupingSequence >= targetDay.groupingSequence
      ) {
        return {
          ...day,
          date: addDaysToIso(day.date, payload.shiftByDays),
        }
      }
      return day
    })

    return {
      ...workingCopy,
      days: updatedDays,
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

