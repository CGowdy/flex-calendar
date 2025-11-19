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
export function normalizeDate(date: Date): string {
  const d = new Date(date)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export function normalizeDateInput(input: Date | string): string {
  const date = typeof input === 'string' ? new Date(input) : input
  return normalizeDate(date)
}

/**
 * Checks if a date is blocked (exception) by comparing against a set of blocked dates.
 */
export function isBlockedDate(
  date: Date,
  blockedDates: Set<string>
): boolean {
  return blockedDates.has(normalizeDate(date))
}

export interface ExceptionLookup {
  global: Set<string>
  perLayer: Record<string, Set<string>>
}

export function buildExceptionLookup({
  items,
  exceptionLayerKeys,
}: {
  items: Array<{ date: Date | string; layerKey: string; targetLayerKeys?: string[] }>
  exceptionLayerKeys: Set<string>
}): ExceptionLookup {
  const lookup: ExceptionLookup = {
    global: new Set<string>(),
    perLayer: {},
  }

  for (const item of items) {
    if (!exceptionLayerKeys.has(item.layerKey)) {
      continue
    }

    const dateKey = normalizeDateInput(item.date)
    const targets =
      item.targetLayerKeys && item.targetLayerKeys.length > 0
        ? item.targetLayerKeys
        : null

    if (!targets) {
      lookup.global.add(dateKey)
      continue
    }

    for (const target of targets) {
      if (!lookup.perLayer[target]) {
        lookup.perLayer[target] = new Set<string>()
      }
      lookup.perLayer[target]!.add(dateKey)
    }
  }

  return lookup
}

export function getBlockedDatesForLayer(
  layerKey: string,
  lookup: ExceptionLookup,
  respectsGlobal: boolean
): Set<string> | undefined {
  const perLayerSet = lookup.perLayer[layerKey]
  if (!respectsGlobal && !perLayerSet) {
    return undefined
  }
  if (!respectsGlobal) {
    return perLayerSet
  }

  if (lookup.global.size === 0 && !perLayerSet) {
    return undefined
  }

  const combined = new Set<string>()
  lookup.global.forEach((value) => combined.add(value))
  if (perLayerSet) {
    perLayerSet.forEach((value) => combined.add(value))
  }
  return combined
}

/**
 * Finds the next valid school date, skipping weekends and holidays.
 */
export function nextSchoolDate(
  currentDate: Date,
  includeWeekends: boolean,
  blockedDates?: Set<string>
): Date {
  let candidate = new Date(currentDate)

  // If weekends are included and no holidays, return as-is
  if (includeWeekends && (!blockedDates || blockedDates.size === 0)) {
    return candidate
  }

  // Find next valid date
  while (true) {
    // Skip weekends if not included
    if (!includeWeekends && isWeekend(candidate)) {
      candidate = addDays(candidate, 1)
      continue
    }

    // Skip blocked dates if provided
    if (blockedDates && isBlockedDate(candidate, blockedDates)) {
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
  blockedDates?: Set<string>
): Date[] {
  const dates: Date[] = []
  let cursor = new Date(startDate)

  for (let i = 0; i < count; i++) {
    const validDate = nextSchoolDate(cursor, includeWeekends, blockedDates)
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
  blockedDates?: Set<string>
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
    const next = nextSchoolDate(cursor, includeWeekends, blockedDates)
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
  blockedDates?: Set<string>
): Date {
  if (steps <= 0) {
    return new Date(date)
  }

  let result = new Date(date)
  let cursor = addDays(result, 1)

  for (let i = 0; i < steps; i++) {
    result = nextSchoolDate(cursor, includeWeekends, blockedDates)
    cursor = addDays(result, 1)
  }

  return result
}

