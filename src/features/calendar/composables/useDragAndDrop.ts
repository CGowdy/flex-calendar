import { ref } from 'vue'
import type { ScheduledItem } from '@/features/calendar/types/calendar'
import { dayKey, daysBetween } from './useDateUtils'

export type DragPayload = {
  scheduledItemId: string
  date: string
  layerKey?: string
  segmentOffset?: number
}

export function useDragAndDrop() {
  const isDragging = ref(false)
  const draggingEventId = ref<string | null>(null)
  const draggingSegmentId = ref<string | null>(null)
  const dragOverKey = ref<string | null>(null)
  const dragOverCounts = ref<Record<string, number>>({})
  const suppressClicks = ref(false)

  function readDragPayload(ev: DragEvent): DragPayload | null {
    const payload = ev.dataTransfer?.getData('application/json')
    const fallback = !payload ? ev.dataTransfer?.getData('text/plain') : null
    if (!payload && !fallback) return null
    try {
      return JSON.parse(payload || (fallback ?? '')) as DragPayload
    } catch {
      return null
    }
  }

  function handleDragStart(
    item: ScheduledItem,
    segmentId: string,
    segmentOffset: number,
    ev: DragEvent
  ) {
    if (!ev.dataTransfer) return
    isDragging.value = true
    draggingEventId.value = item.id
    draggingSegmentId.value = segmentId
    const payload = JSON.stringify({
      scheduledItemId: item.id,
      date: item.date,
      layerKey: item.layerKey,
      segmentOffset,
    })
    // Set multiple types for cross-browser compatibility
    ev.dataTransfer.setData('application/json', payload)
    ev.dataTransfer.setData('text/plain', payload)
    ev.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(ev: DragEvent) {
    if (ev.dataTransfer) {
      ev.dataTransfer.dropEffect = 'move'
    }
    ev.preventDefault()
  }

  function handleDragEnter(date: Date, ev: DragEvent) {
    const key = dayKey(date)
    dragOverCounts.value[key] = (dragOverCounts.value[key] ?? 0) + 1
    dragOverKey.value = key
    handleDragOver(ev)
  }

  function handleDragLeave(date: Date) {
    const key = dayKey(date)
    const next = (dragOverCounts.value[key] ?? 1) - 1
    dragOverCounts.value[key] = Math.max(0, next)
    if (next <= 0 && dragOverKey.value === key) {
      dragOverKey.value = null
    }
  }

  function resetDraggingState() {
    isDragging.value = false
    draggingEventId.value = null
    draggingSegmentId.value = null
  }

  function handleDrop(
    date: Date,
    ev: DragEvent,
    isDateBlocked: (layerKey: string, date: Date, includeWeekends: boolean) => boolean,
    includeWeekends: boolean,
    onShift: (payload: { scheduledItemId: string; shiftByDays: number; layerKeys?: string[] }) => void
  ) {
    ev.preventDefault()
    const data = readDragPayload(ev)
    if (!data) return

    if (data.layerKey && isDateBlocked(data.layerKey, date, includeWeekends)) {
      dragOverCounts.value[dayKey(date)] = 0
      dragOverKey.value = null
      resetDraggingState()
      return
    }

    const originIso = new Date(data.date).toISOString().slice(0, 10)
    const delta = daysBetween(originIso, date)
    if (delta !== 0) {
      onShift({
        scheduledItemId: data.scheduledItemId,
        shiftByDays: delta,
        layerKeys: data.layerKey ? [data.layerKey] : undefined,
      })
    }
    dragOverCounts.value[dayKey(date)] = 0
    dragOverKey.value = null
    resetDraggingState()
    // Prevent synthetic click firing after drop
    suppressClicks.value = true
    setTimeout(() => {
      suppressClicks.value = false
    }, 300)
  }

  function handleEventClick(item: ScheduledItem, ev: MouseEvent, onSelect: (dayId: string) => void) {
    if (isDragging.value || suppressClicks.value) {
      ev.preventDefault()
      ev.stopPropagation()
      ;(ev as unknown as { stopImmediatePropagation?: () => void })
        .stopImmediatePropagation?.()
      return
    }
    onSelect(item.id)
  }

  function handleCaptureClick(ev: MouseEvent) {
    if (isDragging.value || suppressClicks.value) {
      ev.preventDefault()
      ev.stopPropagation()
      ;(ev as unknown as { stopImmediatePropagation?: () => void })
        .stopImmediatePropagation?.()
    }
  }

  return {
    isDragging,
    draggingEventId,
    draggingSegmentId,
    dragOverKey,
    dragOverCounts,
    suppressClicks,
    readDragPayload,
    handleDragStart,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    resetDraggingState,
    handleDrop,
    handleEventClick,
    handleCaptureClick,
  }
}

