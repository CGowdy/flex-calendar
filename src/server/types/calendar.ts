export interface CalendarEventDTO {
  id: string
  title: string
  description: string
  durationDays: number
  metadata: Record<string, unknown>
}

export interface CalendarDayDTO {
  id: string
  date: Date
  groupingKey: string
  groupingSequence: number
  label: string
  notes: string
  events: CalendarEventDTO[]
}

export interface CalendarGroupingDTO {
  key: string
  name: string
  color: string
  description: string
  autoShift: boolean
}

export interface CalendarDTO {
  id: string
  name: string
  source: 'abeka' | 'custom'
  startDate: Date
  totalDays: number
  includeWeekends: boolean
  includeHolidays: boolean
  groupings: CalendarGroupingDTO[]
  days: CalendarDayDTO[]
}

export type CalendarSummaryDTO = Pick<
  CalendarDTO,
  'id' | 'name' | 'startDate' | 'totalDays' | 'groupings'
>

