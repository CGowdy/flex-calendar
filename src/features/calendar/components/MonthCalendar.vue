<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Calendar, ScheduledItem, CalendarLayer } from '@/features/calendar/types/calendar'

import CalendarNavigation from './ui/CalendarNavigation.vue'
import CalendarDayCell from './ui/CalendarDayCell.vue'
import {
  dayKey,
  parseIsoDate,
  addDays,
  normalizeDate,
  startOfMonth,
  endOfMonth,
  isWeekendDay,
} from '@/features/calendar/composables/useDateUtils'
import { buildExceptionLookup } from '@/features/calendar/composables/useExceptionLookup'
import { useDragAndDrop } from '@/features/calendar/composables/useDragAndDrop'

const props = defineProps<{
  calendar: Calendar
  selectedDayId: string | null
  viewDate?: Date
  visibleLayerKeys?: string[]
  ghostStyle?: 'connected' | 'dashed'
}>()

const ghostStyle = computed(() => props.ghostStyle ?? 'connected')
const CELL_GAP_PX = 11
const DAY_PADDING_PX = 0
const hoveredEventId = ref<string | null>(null)

const dragAndDrop = useDragAndDrop()
const isDragging = dragAndDrop.isDragging
const draggingSegmentId = dragAndDrop.draggingSegmentId
const dragOverKey = dragAndDrop.dragOverKey

const emit = defineEmits<{
  (event: 'select-day', dayId: string): void
  (
    event: 'shift-day',
    payload: {
      scheduledItemId: string
      shiftByDays: number
      layerKeys?: string[]
    }
  ): void
  (event: 'update:viewDate', d: Date): void
  (event: 'add-event', payload: { date: string }): void
}>()

const todayIso = new Date().toISOString().slice(0, 10)
const visibleMonth = ref(new Date(props.viewDate ?? new Date()))
watch(() => props.viewDate, (d) => {
  if (d) visibleMonth.value = new Date(d)
})

type DisplayItem = {
  segmentId: string
  base: ScheduledItem
  spanDays: number
  isContinuation: boolean
  isGap: boolean
  isPlaceholder: boolean
  lane: number
  startOrder: number
  gapIndex?: number
  gapLength?: number
  showLabel?: boolean
  segmentDayIndex?: number
  segmentDayCount?: number
  connectLeft?: boolean
  connectRight?: boolean
  continuesAfter?: boolean
  globalOffset?: number
}

const layersByKey = computed(() => {
  const map = new Map<string, CalendarLayer>()
  for (const layer of props.calendar.layers) {
    map.set(layer.key, layer)
  }
  return map
})

const exceptionLookup = computed(() => buildExceptionLookup(props.calendar))

function isDateBlocked(
  layerKey: string,
  date: Date,
  includeWeekends: boolean
): boolean {
  if (!includeWeekends && isWeekendDay(date.getDay())) {
    return true
  }
  const iso = dayKey(date)
  if (exceptionLookup.value.perLayer[layerKey]?.has(iso)) {
    return true
  }
  const layer = layersByKey.value.get(layerKey)
  if ((layer?.respectsGlobalExceptions ?? true) && exceptionLookup.value.global.has(iso)) {
    return true
  }
  return false
}

function clampSpanForSchedule(
  start: Date,
  requestedSpan: number,
  layerKey: string,
  includeWeekends: boolean
): number {
  let allowed = 0
  const cursor = new Date(start)
  while (allowed < requestedSpan) {
    if (isDateBlocked(layerKey, cursor, includeWeekends)) {
      if (allowed === 0) {
        return 1
      }
      break
    }
    allowed++
    cursor.setDate(cursor.getDate() + 1)
  }
  return Math.max(1, allowed)
}

function moveToNextAllowed(
  date: Date,
  layerKey: string,
  includeWeekends: boolean
): Date {
  const next = new Date(date)
  while (isDateBlocked(layerKey, next, includeWeekends)) {
    next.setDate(next.getDate() + 1)
  }
  return next
}

function splitIntoWeekSegments(
  item: ScheduledItem,
  includeWeekends: boolean
): Array<{
  startDateIso: string
  spanDays: number
  offset: number
  isGap: boolean
}> {
  const segments: Array<{
    startDateIso: string
    spanDays: number
    offset: number
    isGap: boolean
  }> = []
  const duration = Math.max(item.durationDays ?? 1, 1)
  let remaining = duration
  let currentStart = new Date(item.date)
  let offset = 0
  while (remaining > 0) {
    const dayOfWeek = currentStart.getDay()
    let span = Math.min(remaining, Math.max(1, 7 - dayOfWeek))
    span = clampSpanForSchedule(currentStart, span, item.layerKey, includeWeekends)
    segments.push({
      startDateIso: dayKey(currentStart),
      spanDays: span,
      offset,
      isGap: false,
    })
    remaining -= span
    const gapStartDate = addDays(currentStart, span)
    let nextDate = gapStartDate
    let gapLength = 0
    while (remaining > 0 && isDateBlocked(item.layerKey, nextDate, includeWeekends)) {
      gapLength += 1
      nextDate = addDays(nextDate, 1)
    }
    let gapOffset = offset + span
    if (gapLength > 0) {
      segments.push({
        startDateIso: dayKey(gapStartDate),
        spanDays: gapLength,
        offset: gapOffset,
        isGap: true,
      })
      gapOffset += gapLength
    }
    currentStart = moveToNextAllowed(nextDate, item.layerKey, includeWeekends)
    offset = gapOffset
  }
  return segments
}


type SegmentedItem = {
  base: ScheduledItem
  segments: Array<{
    startDateIso: string
    spanDays: number
    offset: number
    isGap: boolean
  }>
  startDate: Date
  endDate: Date
  totalSpan: number
}

const segmentedItems = computed<SegmentedItem[]>(() => {
  const includeWeekends = props.calendar.includeWeekends ?? true
  const allow = props.visibleLayerKeys ? new Set(props.visibleLayerKeys) : null
  const results: SegmentedItem[] = []
  for (const item of props.calendar.scheduledItems) {
    if (allow && !allow.has(item.layerKey)) continue
    const segments = splitIntoWeekSegments(item, includeWeekends)
    const startDate = normalizeDate(new Date(item.date))
    const lastSegment = segments[segments.length - 1]
    const totalSpan = lastSegment ? lastSegment.offset + lastSegment.spanDays : 1
    const endDate = addDays(startDate, Math.max(totalSpan, 1) - 1)
    results.push({ base: item, segments, startDate, endDate, totalSpan })
  }
  return results
})

const laneAssignments = computed(() => {
  const laneEndTimes: number[] = []
  const sorted = [...segmentedItems.value].sort((a, b) => {
    const startDiff = a.startDate.getTime() - b.startDate.getTime()
    if (startDiff !== 0) return startDiff
    const endDiff = b.endDate.getTime() - a.endDate.getTime()
    if (endDiff !== 0) return endDiff
    return a.base.title.localeCompare(b.base.title)
  })
  const map = new Map<string, number>()
  for (const item of sorted) {
    let lane = 0
    while (
      laneEndTimes[lane] !== undefined &&
      item.startDate.getTime() <= laneEndTimes[lane]!
    ) {
      lane++
    }
    laneEndTimes[lane] = item.endDate.getTime()
    map.set(item.base.id, lane)
  }
  return map
})

const displayItemsByDate = computed<Record<string, DisplayItem[]>>(() => {
  const map: Record<string, DisplayItem[]> = {}
  const pushEntry = (iso: string, entry: DisplayItem) => {
    if (!map[iso]) {
      map[iso] = []
    }
    map[iso]!.push(entry)
  }
  for (const item of segmentedItems.value) {
    const lane = laneAssignments.value.get(item.base.id) ?? 0
    item.segments.forEach((segment, segmentIndex) => {
      const segmentStart = parseIsoDate(segment.startDateIso)
      const hasLaterRealSegment = item.segments.slice(segmentIndex + 1).some((seg) => !seg.isGap)
      for (let dayOffset = 0; dayOffset < segment.spanDays; dayOffset++) {
        const currentDate = addDays(segmentStart, dayOffset)
        const iso = dayKey(currentDate)
        const isStartOfSegment = dayOffset === 0
        const spanDays = isStartOfSegment ? segment.spanDays : 1
        const isPlaceholder = false
        const absoluteIndex = segment.offset + dayOffset
        const connectLeft = absoluteIndex > 0
        const connectRight = absoluteIndex < (item.totalSpan ?? spanDays) - 1
        pushEntry(iso, {
          segmentId: `${item.base.id}-${segment.startDateIso}${segment.isGap ? '-gap' : ''}-${dayOffset}`,
          base: item.base,
          spanDays,
          isContinuation: segment.isGap ? true : segment.offset > 0 || !isStartOfSegment,
          isGap: segment.isGap,
          isPlaceholder,
          lane,
          startOrder: item.startDate.getTime(),
          gapIndex: segment.isGap ? dayOffset : undefined,
          gapLength: segment.isGap ? segment.spanDays : undefined,
          showLabel: !segment.isGap && isStartOfSegment,
          segmentDayIndex: dayOffset,
          segmentDayCount: segment.spanDays,
          connectLeft,
          connectRight,
          continuesAfter: !segment.isGap && isStartOfSegment ? hasLaterRealSegment : undefined,
          globalOffset: absoluteIndex,
        })
      }
    })
  }
  Object.entries(map).forEach(([iso, items]) => {
    if (items.length > 0) {
      const maxLane = items.reduce((max, entry) => Math.max(max, entry.lane), -1)
      const sampleBase = items.find((entry) => !entry.isPlaceholder)?.base ?? items[0]!.base
      for (let lane = 0; lane <= maxLane; lane++) {
        const laneHasEntry = items.some((entry) => entry.lane === lane)
        if (!laneHasEntry) {
          items.push({
            segmentId: `placeholder-${iso}-${lane}`,
            base: sampleBase,
            spanDays: 1,
            isContinuation: false,
            isGap: false,
            isPlaceholder: true,
            lane,
            startOrder: Number.MAX_SAFE_INTEGER,
          })
        }
      }
    }
    items.sort((a, b) => {
      if (a.lane !== b.lane) {
        return a.lane - b.lane
      }
      if (a.startOrder !== b.startOrder) {
        return a.startOrder - b.startOrder
      }
      return a.segmentId.localeCompare(b.segmentId)
    })
  })
  return map
})

function getLayerColor(layerKey: string): string {
  return layersByKey.value.get(layerKey)?.color ?? '#2563eb'
}

const weeks = computed(() => {
  const start = startOfMonth(visibleMonth.value)
  const end = endOfMonth(visibleMonth.value)
  const startDay = start.getDay() // 0..6
  const gridStart = addDays(start, -startDay) // week starts Sunday

  const totalDays = Math.ceil(((end.getTime() - gridStart.getTime()) / 86400000 + (end.getDay() + 1)) )
  const cells = Array.from({ length: Math.max(35, totalDays) }, (_ , i) =>
    addDays(gridStart, i)
  )

  const chunked: Date[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    chunked.push(cells.slice(i, i + 7))
  }
  return chunked
})


function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

const monthLabel = computed(() =>
  new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
    visibleMonth.value
  )
)

function prevMonth() {
  const d = new Date(visibleMonth.value)
  d.setMonth(d.getMonth() - 1)
  visibleMonth.value = d
  emit('update:viewDate', d)
}

function nextMonth() {
  const d = new Date(visibleMonth.value)
  d.setMonth(d.getMonth() + 1)
  visibleMonth.value = d
  emit('update:viewDate', d)
}


function handleDragStart(item: ScheduledItem, segmentId: string, segmentOffset: number, ev: DragEvent) {
  dragAndDrop.handleDragStart(item, segmentId, segmentOffset, ev)
}

function handleDragOver(ev: DragEvent) {
  dragAndDrop.handleDragOver(ev)
}

function handleDragEnter(date: Date, ev: DragEvent) {
  dragAndDrop.handleDragEnter(date, ev)
}

function handleDragLeave(date: Date) {
  dragAndDrop.handleDragLeave(date)
}

function resetDraggingState() {
  dragAndDrop.resetDraggingState()
}

function handleDrop(date: Date, ev: DragEvent) {
  const includeWeekends = props.calendar.includeWeekends ?? true
  dragAndDrop.handleDrop(
    date,
    ev,
    isDateBlocked,
    includeWeekends,
    (payload) => emit('shift-day', payload)
  )
}


function handleCaptureClick(ev: MouseEvent) {
  dragAndDrop.handleCaptureClick(ev)
}

function handleBadgeEnter(eventId: string) {
  hoveredEventId.value = eventId
}

function handleBadgeLeave(eventId: string) {
  if (hoveredEventId.value === eventId) {
    hoveredEventId.value = null
  }
}
</script>

<template>
  <section class="flex flex-col gap-4" @click.capture="handleCaptureClick">
    <CalendarNavigation
      :label="monthLabel"
      :prev-label="'Previous month'"
      :next-label="'Next month'"
      :on-prev="prevMonth"
      :on-next="nextMonth"
    />

    <div class="grid grid-cols-7 gap-px rounded-2xl bg-slate-200/70 p-px dark:bg-slate-700/60">
      <div
        v-for="d in ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']"
        :key="d"
        class="bg-slate-50 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-300"
      >
        {{ d }}
      </div>

      <template v-for="(week, wi) in weeks" :key="wi">
        <CalendarDayCell
          v-for="date in week"
          :key="date.toISOString()"
          :date="date"
          :display-items="displayItemsByDate[dayKey(date)] ?? []"
          :selected-day-id="selectedDayId"
          :hovered-event-id="hoveredEventId"
          :dragging-segment-id="draggingSegmentId"
          :is-dragging="isDragging"
          :drag-over-key="dragOverKey"
          :today-iso="todayIso"
          :is-same-month="isSameMonth(date, visibleMonth)"
          :visible-month="visibleMonth"
          :ghost-style="ghostStyle"
          :cell-gap-px="CELL_GAP_PX"
          :cell-padding-px="DAY_PADDING_PX"
          :get-layer-color="getLayerColor"
          @select-day="(dayId) => emit('select-day', dayId)"
          @add-event="(payload) => emit('add-event', payload)"
          @dragstart="(payload) => handleDragStart(payload.item, payload.segmentId, payload.segmentOffset, payload.ev)"
          @dragend="resetDraggingState"
          @badge-enter="handleBadgeEnter"
          @badge-leave="handleBadgeLeave"
          @dragenter="(ev) => handleDragEnter(date, ev)"
          @dragover="handleDragOver"
          @dragleave="() => handleDragLeave(date)"
          @drop="(ev) => handleDrop(date, ev)"
        />
      </template>
    </div>
  </section>
</template>


