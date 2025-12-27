import { apiFetch } from '../../../lib/apiClient'
import type {
  Calendar,
  CalendarSummary,
  CreateCalendarRequest,
  ShiftScheduledItemsRequest,
  UpdateCalendarRequest,
  SplitScheduledItemRequest,
  CreateScheduledItemRequest,
  UnsplitScheduledItemRequest,
} from '../types/calendar'
import type { UpdateExceptionsRequest } from '../types/calendar'

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

export async function shiftScheduledItems(
  calendarId: string,
  payload: ShiftScheduledItemsRequest
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

export async function updateExceptions(
  calendarId: string,
  payload: UpdateExceptionsRequest
): Promise<Calendar> {
  return apiFetch<Calendar>(`/calendars/${calendarId}/exceptions`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function splitScheduledItem(
  calendarId: string,
  payload: SplitScheduledItemRequest
): Promise<Calendar> {
  return apiFetch<Calendar>(`/calendars/${calendarId}/split`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function unsplitScheduledItem(
  calendarId: string,
  payload: UnsplitScheduledItemRequest
): Promise<Calendar> {
  return apiFetch<Calendar>(`/calendars/${calendarId}/unsplit`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function createScheduledItem(
  calendarId: string,
  payload: CreateScheduledItemRequest
): Promise<Calendar> {
  return apiFetch<Calendar>(`/calendars/${calendarId}/events`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteLayer(
  calendarId: string,
  layerKey: string
): Promise<Calendar> {
  return apiFetch<Calendar>(`/calendars/${calendarId}/layers/${layerKey}`, {
    method: 'DELETE',
  })
}

