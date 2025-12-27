import type {
  Calendar,
  ScheduledItem,
  CalendarLayer,
  ShiftScheduledItemsRequest,
} from '../types/calendar'
import { buildExceptionLookup, type ExceptionLookup } from './useExceptionLookup'

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay()
  return day === 0 || day === 6
}

function normalizeDate(date: Date): string {
  const d = new Date(date)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function getExceptionLayerKeys(layers: CalendarLayer[]): Set<string> {
  return new Set(
    layers
      .filter((layer) => layer.kind === 'exception' || layer.key === 'exceptions')
      .map((layer) => layer.key)
  )
}

function getBlockedDatesForLayer(
  layerKey: string,
  lookup: ExceptionLookup,
  respectsGlobal: boolean
): Set<string> | undefined {
  const perLayerSet = lookup.perLayer[layerKey]
  if (!respectsGlobal && !perLayerSet) {
    return undefined
  }
  if (!respectsGlobal) {
    return perLayerSet
  }

  if (lookup.global.size === 0 && !perLayerSet) {
    return undefined
  }

  const combined = new Set<string>()
  lookup.global.forEach((value) => combined.add(value))
  if (perLayerSet) {
    perLayerSet.forEach((value) => combined.add(value))
  }
  return combined
}

function countValidDaySpan(
  startDate: Date,
  endDate: Date,
  includeWeekends: boolean,
  holidayDates?: Set<string>
): number {
  const startTime = startDate.getTime()
  const endTime = endDate.getTime()

  if (startTime === endTime) {
    return 0
  }

  const [earlier, later] =
    startTime <= endTime ? [startDate, endDate] : [endDate, startDate]

  const targetKey = normalizeDate(later)
  if (normalizeDate(earlier) === targetKey) {
    return 0
  }

  let steps = 0
  let cursor = addDays(earlier, 1)
  let guard = 0

  while (guard < 2000) {
    const next = nextSchoolDate(cursor, includeWeekends, holidayDates)
    steps += 1
    if (normalizeDate(next) === targetKey) {
      return steps
    }
    cursor = addDays(next, 1)
    guard += 1
  }

  return steps
}

function addValidSchoolDays(
  date: Date,
  steps: number,
  includeWeekends: boolean,
  holidayDates?: Set<string>
): Date {
  if (steps <= 0) {
    return new Date(date)
  }

  let result = new Date(date)
  let cursor = addDays(result, 1)

  for (let i = 0; i < steps; i++) {
    result = nextSchoolDate(cursor, includeWeekends, holidayDates)
    cursor = addDays(result, 1)
  }

  return result
}

function nextSchoolDate(
  currentDate: Date,
  includeWeekends: boolean,
  holidayDates?: Set<string>
): Date {
  let candidate = new Date(currentDate)

  if (includeWeekends && (!holidayDates || holidayDates.size === 0)) {
    return candidate
  }

  while (true) {
    if (!includeWeekends && isWeekend(candidate)) {
      candidate = addDays(candidate, 1)
      continue
    }

    if (holidayDates && holidayDates.has(normalizeDate(candidate))) {
      candidate = addDays(candidate, 1)
      continue
    }

    break
  }

  return candidate
}

function toEffectiveLayerKeys(
  calendar: Calendar,
  explicitKeys?: string[],
  targetLayerKey?: string
): Set<string> {
  if (explicitKeys && explicitKeys.length > 0) {
    return new Set(explicitKeys)
  }

  // Default to only the target item's layer (single-layer chaining)
  if (targetLayerKey) {
    return new Set([targetLayerKey])
  }

  // Fallback: if no target layer specified, return empty set (shouldn't happen in practice)
  return new Set()
}

export function useScheduleAdjuster() {
  function shiftScheduledItemsLocally(
    calendar: Calendar,
    payload: ShiftScheduledItemsRequest
  ): Calendar {
    const workingCopy = JSON.parse(JSON.stringify(calendar)) as Calendar

    if (payload.shiftByDays === 0) {
      return workingCopy
    }

    const targetId = payload.scheduledItemId
    const targetItem = workingCopy.scheduledItems.find(
      (item) => item.id === targetId
    )
    if (!targetItem) {
      return workingCopy
    }

    const effectiveLayerKeys = toEffectiveLayerKeys(
      workingCopy,
      payload.layerKeys,
      targetItem.layerKey
    )

    const exceptionLookup = buildExceptionLookup(workingCopy)

    const targetLayer = workingCopy.layers.find((l) => l.key === targetItem.layerKey)
    const targetBlockedDates =
      workingCopy.includeExceptions && targetLayer
        ? getBlockedDatesForLayer(
            targetItem.layerKey,
            exceptionLookup,
            targetLayer.respectsGlobalExceptions !== false
          )
        : workingCopy.includeExceptions
          ? exceptionLookup.global
          : undefined

    const rawNewDate = addDays(new Date(targetItem.date), payload.shiftByDays)

    const newTargetDate = nextSchoolDate(
      rawNewDate,
      workingCopy.includeWeekends,
      targetBlockedDates
    )

    const startingSequence = targetItem.sequenceIndex ?? 0

    const itemsToReflow = workingCopy.scheduledItems
      .filter(
        (item) =>
          effectiveLayerKeys.has(item.layerKey) &&
          (item.sequenceIndex ?? 0) >= startingSequence
      )
      .sort(
        (a, b) =>
        (a.sequenceIndex ?? 0) - (b.sequenceIndex ?? 0)
      )

    if (itemsToReflow.length === 0) {
      const updatedItems = workingCopy.scheduledItems.map((item) =>
        item.id === targetItem.id
          ? { ...item, date: newTargetDate.toISOString() }
          : item
      )
      return { ...workingCopy, scheduledItems: updatedItems }
    }

    const targetIndex = itemsToReflow.findIndex(
      (item) => item.id === targetItem.id
    )
    if (targetIndex === -1) {
      const updatedItems = workingCopy.scheduledItems.map((item) =>
        item.id === targetItem.id
          ? { ...item, date: newTargetDate.toISOString() }
          : item
      )
      return { ...workingCopy, scheduledItems: updatedItems }
    }
    if (targetIndex > 0) {
      const [targetInList] = itemsToReflow.splice(targetIndex, 1)
      if (targetInList) {
        itemsToReflow.unshift(targetInList)
      }
    }

    const gapSpans: number[] = []
    for (let i = 0; i < itemsToReflow.length - 1; i++) {
      const current = new Date(itemsToReflow[i]!.date)
      const next = new Date(itemsToReflow[i + 1]!.date)
      const nextLayer = workingCopy.layers.find((l) => l.key === itemsToReflow[i + 1]!.layerKey)
      const blockedDatesForNext =
        workingCopy.includeExceptions && nextLayer
          ? getBlockedDatesForLayer(
              nextLayer.key,
              exceptionLookup,
              nextLayer.respectsGlobalExceptions !== false
            )
          : workingCopy.includeExceptions
            ? exceptionLookup.global
            : undefined
      const span = countValidDaySpan(
        current,
        next,
        workingCopy.includeWeekends,
        blockedDatesForNext
      )
      // Guard against invalid spans (shouldn't exceed reasonable bounds)
      const safeSpan = span > 0 && span < 1000 ? span : 1
      gapSpans.push(safeSpan)
    }

    const firstItem = itemsToReflow[0]!
    const updatedFirstItem = {
      ...firstItem,
      date: newTargetDate.toISOString(),
    }

    const remainingItems = itemsToReflow.slice(1)

    const updatedItemsMap = new Map<string, ScheduledItem>()
    for (const item of workingCopy.scheduledItems) {
      updatedItemsMap.set(item.id, item)
    }

    updatedItemsMap.set(updatedFirstItem.id, updatedFirstItem)

    let previousDate = newTargetDate
    for (let i = 0; i < remainingItems.length; i++) {
      const item = remainingItems[i]!
      const span = gapSpans[i] ?? 1
      const itemLayer = workingCopy.layers.find((l) => l.key === item.layerKey)
      const blockedDates =
        workingCopy.includeExceptions && itemLayer
          ? getBlockedDatesForLayer(
              itemLayer.key,
              exceptionLookup,
              itemLayer.respectsGlobalExceptions !== false
            )
          : workingCopy.includeExceptions
            ? exceptionLookup.global
            : undefined
      const nextDate = addValidSchoolDays(
        previousDate,
        span,
        workingCopy.includeWeekends,
        blockedDates
      )
      updatedItemsMap.set(item.id, {
        ...item,
        date: nextDate.toISOString(),
      })
      previousDate = nextDate
    }

    return {
      ...workingCopy,
      scheduledItems: Array.from(updatedItemsMap.values()),
    }
  }

  function layerOptions(calendar: Calendar): Array<{
    key: string
    label: string
    chainBehavior: string
  }> {
    return calendar.layers.map((layer: CalendarLayer) => ({
      key: layer.key,
      label: layer.name,
      chainBehavior: layer.chainBehavior,
    }))
  }

  return {
    shiftScheduledItemsLocally,
    layerOptions,
  }
}

