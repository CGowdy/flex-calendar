import { apiFetch } from '../../../lib/apiClient'
import type {
  Calendar,
  CalendarSummary,
  CreateCalendarRequest,
  ShiftCalendarDaysRequest,
  UpdateCalendarRequest,
} from '../types/calendar'

export async function fetchCalendars(): Promise<CalendarSummary[]> {
  return apiFetch<CalendarSummary[]>('/calendars')
}

export async function fetchCalendarById(
  calendarId: string
): Promise<Calendar> {
  return apiFetch<Calendar>(`/calendars/${calendarId}`)
}

export async function createCalendar(
  payload: CreateCalendarRequest
): Promise<Calendar> {
  return apiFetch<Calendar>('/calendars', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function shiftCalendarDays(
  calendarId: string,
  payload: ShiftCalendarDaysRequest
): Promise<Calendar> {
  return apiFetch<Calendar>(`/calendars/${calendarId}/shift`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateCalendarMeta(
  calendarId: string,
  payload: UpdateCalendarRequest
): Promise<Calendar> {
  return apiFetch<Calendar>(`/calendars/${calendarId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

