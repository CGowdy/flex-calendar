import { computed, type ComputedRef } from 'vue'
import type { Calendar } from '@/features/calendar/types/calendar'
import { dayKey, isWeekendDay } from './useDateUtils'

export type ExceptionLookup = {
  global: Set<string>
  perLayer: Record<string, Set<string>>
}

/**
 * Builds an exception lookup map from calendar scheduled items
 */
export function buildExceptionLookup(calendar: Calendar): ExceptionLookup {
  const lookup: ExceptionLookup = {
    global: new Set<string>(),
    perLayer: {},
  }
  for (const item of calendar.scheduledItems) {
    const layer = calendar.layers.find((entry) => entry.key === item.layerKey)
    if (!layer || layer.kind !== 'exception') continue
    const iso = dayKey(new Date(item.date))
    const targets =
      item.targetLayerKeys && item.targetLayerKeys.length > 0 ? item.targetLayerKeys : null
    if (!targets) {
      lookup.global.add(iso)
    } else {
      targets.forEach((target) => {
        if (!lookup.perLayer[target]) lookup.perLayer[target] = new Set<string>()
        lookup.perLayer[target]!.add(iso)
      })
    }
  }
  return lookup
}

/**
 * Composable that provides exception lookup for a calendar
 */
export function useExceptionLookup(calendar: ComputedRef<Calendar>) {
  const lookup = computed(() => buildExceptionLookup(calendar.value))

  function isDateBlocked(
    layerKey: string,
    date: Date,
    includeWeekends: boolean,
    layersByKey: Map<string, Calendar['layers'][number]>
  ): boolean {
    if (!includeWeekends && isWeekendDay(date.getDay())) {
      return true
    }
    const iso = dayKey(date)
    if (lookup.value.perLayer[layerKey]?.has(iso)) {
      return true
    }
    const layer = layersByKey.get(layerKey)
    if ((layer?.respectsGlobalExceptions ?? true) && lookup.value.global.has(iso)) {
      return true
    }
    return false
  }

  return {
    lookup,
    isDateBlocked,
  }
}

