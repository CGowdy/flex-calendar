import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  createCalendar,
  fetchCalendarById,
  fetchCalendars,
  shiftCalendarDays,
} from '../api/calendarApi'
import type {
  Calendar,
  CalendarDay,
  CalendarSummary,
  CreateCalendarRequest,
  ShiftCalendarDaysRequest,
} from '../types/calendar'
import { useScheduleAdjuster } from '../composables/useScheduleAdjuster'

interface LoadOptions {
  force?: boolean
}

export const useCalendarStore = defineStore('calendar', () => {
  const calendars = ref<CalendarSummary[]>([])
  const calendarsLoaded = ref(false)
  const activeCalendarId = ref<string | null>(null)
  const activeCalendar = ref<Calendar | null>(null)
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)

  const adjuster = useScheduleAdjuster()

  const autoShiftGroupingKeys = computed(() =>
    activeCalendar.value
      ? activeCalendar.value.groupings
          .filter((grouping) => grouping.autoShift)
          .map((grouping) => grouping.key)
      : []
  )

  const daysByGrouping = computed<Record<string, CalendarDay[]>>(() => {
    if (!activeCalendar.value) {
      return {}
    }

    return activeCalendar.value.days.reduce<Record<string, CalendarDay[]>>(
      (acc, day) => {
        if (!acc[day.groupingKey]) {
          acc[day.groupingKey] = []
        }
        acc[day.groupingKey]!.push(day)
        return acc
      },
      {}
    )
  })

  async function loadCalendars(options: LoadOptions = {}): Promise<void> {
    if (calendarsLoaded.value && !options.force) {
      return
    }

    isLoading.value = true
    errorMessage.value = null
    try {
      calendars.value = await fetchCalendars()
      calendarsLoaded.value = true
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : 'Failed to load calendars'
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function loadCalendar(
    calendarId: string,
    options: LoadOptions = {}
  ): Promise<Calendar> {
    if (
      activeCalendar.value &&
      activeCalendar.value.id === calendarId &&
      !options.force
    ) {
      return activeCalendar.value
    }

    isLoading.value = true
    errorMessage.value = null
    try {
      const calendar = await fetchCalendarById(calendarId)
      activeCalendarId.value = calendarId
      activeCalendar.value = calendar
      if (!calendars.value.some((summary) => summary.id === calendarId)) {
        calendars.value = [...calendars.value, calendar]
      }
      return calendar
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : 'Failed to load calendar'
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function createCalendarAndSelect(
    payload: CreateCalendarRequest
  ): Promise<Calendar> {
    isLoading.value = true
    errorMessage.value = null
    try {
      const calendar = await createCalendar(payload)
      calendars.value = [...calendars.value, calendar]
      activeCalendarId.value = calendar.id
      activeCalendar.value = calendar
      return calendar
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : 'Failed to create calendar'
      throw error
    } finally {
      isLoading.value = false
    }
  }

  function selectCalendar(calendarId: string | null) {
    activeCalendarId.value = calendarId
    if (calendarId === null) {
      activeCalendar.value = null
    }
  }

  async function shiftCalendarDay(
    payload: ShiftCalendarDaysRequest
  ): Promise<Calendar | null> {
    if (!activeCalendar.value || !activeCalendarId.value) {
      return null
    }

    const shiftOptions: ShiftCalendarDaysRequest = {
      ...payload,
      groupingKeys:
        payload.groupingKeys && payload.groupingKeys.length > 0
          ? payload.groupingKeys
          : autoShiftGroupingKeys.value,
    }

    const originalSnapshot = structuredClone(activeCalendar.value)
    activeCalendar.value = adjuster.shiftCalendarDaysLocally(
      activeCalendar.value,
      shiftOptions
    )

    try {
      const updatedCalendar = await shiftCalendarDays(
        activeCalendarId.value,
        shiftOptions
      )
      activeCalendar.value = updatedCalendar
      calendars.value = calendars.value.map((summary) =>
        summary.id === updatedCalendar.id ? updatedCalendar : summary
      )
      return updatedCalendar
    } catch (error) {
      activeCalendar.value = originalSnapshot
      errorMessage.value =
        error instanceof Error ? error.message : 'Failed to shift calendar day'
      throw error
    }
  }

  return {
    calendars,
    calendarsLoaded,
    activeCalendarId,
    activeCalendar,
    isLoading,
    errorMessage,
    autoShiftGroupingKeys,
    daysByGrouping,
    loadCalendars,
    loadCalendar,
    createCalendarAndSelect,
    selectCalendar,
    shiftCalendarDay,
  }
})

