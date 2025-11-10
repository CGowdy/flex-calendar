export interface CalendarEvent {
  id: string
  title: string
  description: string
  durationDays: number
  metadata: Record<string, unknown>
}

export interface CalendarDay {
  id: string
  date: string
  groupingKey: string
  groupingSequence: number
  label: string
  notes: string
  events: CalendarEvent[]
}

export interface CalendarGrouping {
  key: string
  name: string
  color: string
  description: string
  autoShift: boolean
}

export interface Calendar {
  id: string
  name: string
  source: 'abeka' | 'custom'
  startDate: string
  totalDays: number
  includeWeekends: boolean
  includeHolidays: boolean
  groupings: CalendarGrouping[]
  days: CalendarDay[]
}

export type CalendarSummary = Pick<
  Calendar,
  'id' | 'name' | 'startDate' | 'totalDays' | 'groupings'
>

export interface CreateCalendarRequest {
  name: string
  source?: 'abeka' | 'custom'
  startDate: string
  totalDays?: number
  includeWeekends?: boolean
  includeHolidays?: boolean
  groupings?: Array<
    Pick<CalendarGrouping, 'key' | 'name' | 'autoShift'> & {
      color?: string
      description?: string
    }
  >
  eventsPerGrouping?: Record<
    string,
    Array<{
      title: string
      description?: string
      durationDays?: number
    }>
  >
}

export interface ShiftCalendarDaysRequest {
  dayId: string
  shiftByDays: number
  groupingKeys?: string[]
}

