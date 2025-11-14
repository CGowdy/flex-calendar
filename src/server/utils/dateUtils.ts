export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay()
  return day === 0 || day === 6
}

/**
 * Normalizes a date to midnight UTC for comparison purposes.
 */
function normalizeDate(date: Date): string {
  const d = new Date(date)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

/**
 * Checks if a date is a holiday by comparing against a set of holiday dates.
 */
export function isHoliday(
  date: Date,
  holidayDates: Set<string>
): boolean {
  return holidayDates.has(normalizeDate(date))
}

/**
 * Gets the set of holiday dates from calendar days with groupingKey='holidays'.
 */
export function getHolidayDates(
  days: Array<{ date: Date | string; groupingKey: string }>
): Set<string> {
  const holidaySet = new Set<string>()
  for (const day of days) {
    if (day.groupingKey === 'holidays') {
      const date = typeof day.date === 'string' ? new Date(day.date) : day.date
      holidaySet.add(normalizeDate(date))
    }
  }
  return holidaySet
}

/**
 * Finds the next valid school date, skipping weekends and holidays.
 */
export function nextSchoolDate(
  currentDate: Date,
  includeWeekends: boolean,
  holidayDates?: Set<string>
): Date {
  let candidate = new Date(currentDate)

  // If weekends are included and no holidays, return as-is
  if (includeWeekends && (!holidayDates || holidayDates.size === 0)) {
    return candidate
  }

  // Find next valid date
  while (true) {
    // Skip weekends if not included
    if (!includeWeekends && isWeekend(candidate)) {
      candidate = addDays(candidate, 1)
      continue
    }

    // Skip holidays if provided
    if (holidayDates && isHoliday(candidate, holidayDates)) {
      candidate = addDays(candidate, 1)
      continue
    }

    // Found valid date
    break
  }

  return candidate
}

/**
 * Generates a sequence of valid school dates starting from a given date.
 * Skips weekends (if includeWeekends=false) and holidays.
 *
 * @param startDate - Starting date
 * @param count - Number of dates to generate
 * @param includeWeekends - Whether to include weekends
 * @param holidayDates - Set of holiday dates to exclude
 * @returns Array of valid school dates
 */
export function generateValidSchoolDates(
  startDate: Date,
  count: number,
  includeWeekends: boolean,
  holidayDates?: Set<string>
): Date[] {
  const dates: Date[] = []
  let cursor = new Date(startDate)

  for (let i = 0; i < count; i++) {
    const validDate = nextSchoolDate(cursor, includeWeekends, holidayDates)
    dates.push(new Date(validDate))
    // Start next iteration from the day after the valid date
    cursor = addDays(validDate, 1)
  }

  return dates
}

export function countValidDaySpan(
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

export function addValidSchoolDays(
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

