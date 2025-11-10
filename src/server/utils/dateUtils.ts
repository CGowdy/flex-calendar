export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function nextSchoolDate(
  currentDate: Date,
  includeWeekends: boolean
): Date {
  if (includeWeekends) {
    return currentDate
  }

  let candidate = new Date(currentDate)
  while (isWeekend(candidate)) {
    candidate = addDays(candidate, 1)
  }

  return candidate
}

