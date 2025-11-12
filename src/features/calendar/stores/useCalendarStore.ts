import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  createCalendar,
  fetchCalendarById,
  fetchCalendars,
  shiftCalendarDays,
  updateCalendarMeta,
} from '@api/calendarApi'
import type {
  Calendar,
  CalendarDay,
  CalendarSummary,
  CreateCalendarRequest,
  ShiftCalendarDaysRequest,
} from '@/features/calendar/types/calendar'
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

  const hiddenGroupingKeys = ref<Set<string>>(new Set())
  const visibleGroupingKeys = computed<string[]>(() => {
    if (!activeCalendar.value) return []
    return activeCalendar.value.groupings
      .map((g) => g.key)
      .filter((k) => !hiddenGroupingKeys.value.has(k))
  })

  function setGroupingVisibility(key: string, visible: boolean): void {
    const next = new Set(hiddenGroupingKeys.value)
    if (visible) {
      next.delete(key)
    } else {
      next.add(key)
    }
    hiddenGroupingKeys.value = next
  }

  function updateGroupingColor(key: string, color: string): void {
    if (!activeCalendar.value) return
    const updated = {
      ...activeCalendar.value,
      groupings: activeCalendar.value.groupings.map((g) =>
        g.key === key ? { ...g, color } : g
      ),
    }
    activeCalendar.value = updated
    calendars.value = calendars.value.map((c) =>
      c.id === updated.id ? updated : c
    )
  }

  async function persistGroupingColor(key: string, color: string): Promise<void> {
    if (!activeCalendar.value || !activeCalendarId.value) return
    try {
      const updated = await updateCalendarMeta(activeCalendarId.value, {
        groupings: [{ key, color }],
      })
      activeCalendar.value = updated
      calendars.value = calendars.value.map((c) =>
        c.id === updated.id ? updated : c
      )
    } catch (error) {
      // revert local change if persisted call fails
      await loadCalendar(activeCalendarId.value, { force: true })
      throw error
    }
  }

  // Debounced persist to avoid spamming the backend while the color input is dragged.
  const colorPersistTimers = new Map<string, number>()
  function schedulePersistGroupingColor(key: string, color: string, waitMs = 1000) {
    const existing = colorPersistTimers.get(key)
    if (existing) {
      clearTimeout(existing)
    }
    const timer = window.setTimeout(() => {
      colorPersistTimers.delete(key)
      void persistGroupingColor(key, color)
    }, waitMs)
    colorPersistTimers.set(key, timer)
  }

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

    const originalSnapshot = activeCalendar.value
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
    visibleGroupingKeys,
    daysByGrouping,
    loadCalendars,
    loadCalendar,
    createCalendarAndSelect,
    selectCalendar,
    shiftCalendarDay,
    setGroupingVisibility,
    updateGroupingColor,
    persistGroupingColor,
    schedulePersistGroupingColor,
  }
})

