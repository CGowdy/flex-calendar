import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  createCalendar,
  fetchCalendarById,
  fetchCalendars,
  shiftScheduledItems,
  updateCalendarMeta,
} from '@api/calendarApi'
import type {
  Calendar,
  ScheduledItem,
  CalendarSummary,
  CreateCalendarRequest,
  ShiftScheduledItemsRequest,
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

  const linkedLayerKeys = computed(() =>
    activeCalendar.value
      ? activeCalendar.value.layers
          .filter((layer) => layer.chainBehavior === 'linked')
          .map((layer) => layer.key)
      : []
  )

  const hiddenLayerKeys = ref<Set<string>>(new Set())
  const visibleLayerKeys = computed<string[]>(() => {
    if (!activeCalendar.value) return []
    return activeCalendar.value.layers
      .map((layer) => layer.key)
      .filter((key) => !hiddenLayerKeys.value.has(key))
  })

  function setLayerVisibility(key: string, visible: boolean): void {
    const next = new Set(hiddenLayerKeys.value)
    if (visible) {
      next.delete(key)
    } else {
      next.add(key)
    }
    hiddenLayerKeys.value = next
  }

  function updateLayerColor(key: string, color: string): void {
    if (!activeCalendar.value) return
    const updated = {
      ...activeCalendar.value,
      layers: activeCalendar.value.layers.map((layer) =>
        layer.key === key ? { ...layer, color } : layer
      ),
    }
    activeCalendar.value = updated
    calendars.value = calendars.value.map((c) =>
      c.id === updated.id ? updated : c
    )
  }

  async function persistLayerColor(key: string, color: string): Promise<void> {
    if (!activeCalendar.value || !activeCalendarId.value) return
    try {
      const updated = await updateCalendarMeta(activeCalendarId.value, {
        layers: [{ key, color }],
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

  const colorPersistTimers = new Map<string, number>()
  function schedulePersistLayerColor(key: string, color: string, waitMs = 1000) {
    const existing = colorPersistTimers.get(key)
    if (existing) {
      clearTimeout(existing)
    }
    const timer = window.setTimeout(() => {
      colorPersistTimers.delete(key)
      void persistLayerColor(key, color)
    }, waitMs)
    colorPersistTimers.set(key, timer)
  }

  const scheduledItemsByLayer = computed<Record<string, ScheduledItem[]>>(() => {
    if (!activeCalendar.value) {
      return {}
    }

    return activeCalendar.value.scheduledItems.reduce<
      Record<string, ScheduledItem[]>
    >((acc, item) => {
      if (!acc[item.layerKey]) {
        acc[item.layerKey] = []
      }
      acc[item.layerKey]!.push(item)
        return acc
    }, {})
  })

  function slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  function generateLayerKey(name: string): string {
    const existing = new Set(
      activeCalendar.value?.layers.map((layer) => layer.key) ?? []
    )
    const base = slugify(name) || 'layer'
    let candidate = base
    let suffix = 1
    while (existing.has(candidate)) {
      candidate = `${base}-${suffix}`
      suffix += 1
    }
    return candidate
  }

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

  async function createLayerForActiveCalendar(options: {
    name: string
    color?: string
    chainBehavior?: 'linked' | 'independent'
    kind?: 'standard' | 'exception'
  }): Promise<Calendar | null> {
    if (!activeCalendar.value || !activeCalendarId.value) {
      throw new Error('Select a calendar before adding layers')
    }

    const trimmedName = options.name.trim()
    if (!trimmedName) {
      throw new Error('Layer name is required')
    }

    const key = generateLayerKey(trimmedName)
    const patch = {
      layers: [
        {
          key,
          name: trimmedName,
          color: options.color ?? '#64748b',
          description: '',
          chainBehavior: options.chainBehavior ?? 'linked',
          kind: options.kind ?? 'standard',
        },
      ],
    }

    const updated = await updateCalendarMeta(activeCalendarId.value, patch)
    activeCalendar.value = updated
    calendars.value = calendars.value.map((summary) =>
      summary.id === updated.id ? updated : summary
    )
    return updated
  }

  function selectCalendar(calendarId: string | null) {
    activeCalendarId.value = calendarId
    if (calendarId === null) {
      activeCalendar.value = null
    }
  }

  async function shiftScheduledItem(
    payload: ShiftScheduledItemsRequest
  ): Promise<Calendar | null> {
    if (!activeCalendar.value || !activeCalendarId.value) {
      return null
    }

    const shiftOptions: ShiftScheduledItemsRequest = {
      ...payload,
      layerKeys:
        payload.layerKeys && payload.layerKeys.length > 0
          ? payload.layerKeys
          : linkedLayerKeys.value,
    }

    const originalSnapshot = activeCalendar.value
    activeCalendar.value = adjuster.shiftScheduledItemsLocally(
      activeCalendar.value,
      shiftOptions
    )

    try {
      const updatedCalendar = await shiftScheduledItems(
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
        error instanceof Error ? error.message : 'Failed to shift scheduled item'
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
    linkedLayerKeys,
    visibleLayerKeys,
    scheduledItemsByLayer,
    loadCalendars,
    loadCalendar,
    createCalendarAndSelect,
    selectCalendar,
    shiftScheduledItem,
    setLayerVisibility,
    updateLayerColor,
    persistLayerColor,
    schedulePersistLayerColor,
    createLayerForActiveCalendar,
  }
})

