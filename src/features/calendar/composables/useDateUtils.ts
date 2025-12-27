/**
 * Shared date utility functions for calendar components
 */
export function dayKey(date: Date | string): string {
  if (typeof date === 'string') {
    return date.slice(0, 10)
  }
  return date.toISOString().slice(0, 10)
}

export function parseIsoDate(iso: string): Date {
  // Parse as UTC to avoid timezone issues when comparing with daysBetween
  // which uses UTC components. This ensures "2025-12-26" is always 2025-12-26 00:00:00 UTC
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1, 0, 0, 0, 0))
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function normalizeDate(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function startOfMonth(date: Date): Date {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfMonth(date: Date): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + 1, 0)
  d.setHours(0, 0, 0, 0)
  return d
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function isWeekendDay(day: number): boolean {
  return day === 0 || day === 6
}

export function daysBetween(aIso: string, b: Date): number {
  // Compare in UTC days to avoid timezone off-by-one
  const a = new Date(aIso)
  const aUtc = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())
  const bUtc = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate())
  return Math.round((bUtc - aUtc) / 86400000)
}

export function formatDate(
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '—'
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }
  return new Intl.DateTimeFormat(undefined, options ?? defaultOptions).format(dateObj)
}

