<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Calendar, ScheduledItem, CalendarLayer } from '@/features/calendar/types/calendar'

import MultiDayBadge from './MultiDayBadge.vue'

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
const draggingEventId = ref<string | null>(null)
const draggingSegmentId = ref<string | null>(null)

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
const dragOverKey = ref<string | null>(null)
const dragOverCounts = ref<Record<string, number>>({})
const isDragging = ref(false)
const suppressClicks = ref(false)

const dayKey = (d: Date) => d.toISOString().slice(0, 10)

function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
  date.setHours(0, 0, 0, 0)
  return date
}

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

const isWeekendDay = (day: number) => day === 0 || day === 6

type ExceptionLookup = {
  global: Set<string>
  perLayer: Record<string, Set<string>>
}

function buildExceptionLookup(calendar: Calendar): ExceptionLookup {
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

function normalizeDate(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
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
  const lanes: number[] = []
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
      item.startDate.getTime() <= laneEndTimes[lane]
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
      const hasPrevRealSegment = item.segments.slice(0, segmentIndex).some((seg) => !seg.isGap)
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

function startOfMonth(date: Date): Date {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfMonth(date: Date): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + 1, 0)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
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

function nextMonth() {
  const d = new Date(visibleMonth.value)
  d.setMonth(d.getMonth() + 1)
  visibleMonth.value = d
  emit('update:viewDate', d)
}

function prevMonth() {
  const d = new Date(visibleMonth.value)
  d.setMonth(d.getMonth() - 1)
  visibleMonth.value = d
  emit('update:viewDate', d)
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

const monthLabel = computed(() =>
  new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
    visibleMonth.value
  )
)

function daysBetween(aIso: string, b: Date): number {
  // Compare in UTC days to avoid timezone off-by-one
  const a = new Date(aIso)
  const aUtc = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())
  const bUtc = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate())
  return Math.round((bUtc - aUtc) / 86400000)
}

type DragPayload = {
  scheduledItemId: string
  date: string
  layerKey?: string
  segmentOffset?: number
}

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

function handleDrop(date: Date, ev: DragEvent) {
  ev.preventDefault()
  const data = readDragPayload(ev)
  if (!data) return
  const includeWeekends = props.calendar.includeWeekends ?? true
  if (data.layerKey && isDateBlocked(data.layerKey, date, includeWeekends)) {
    dragOverCounts.value[dayKey(date)] = 0
    dragOverKey.value = null
    resetDraggingState()
    return
  }
  const originIso = new Date(data.date).toISOString().slice(0, 10)
  const delta = daysBetween(originIso, date)
  if (delta !== 0) {
    emit('shift-day', {
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

function handleBadgeEnter(eventId: string) {
  hoveredEventId.value = eventId
}

function handleBadgeLeave(eventId: string) {
  if (hoveredEventId.value === eventId) {
    hoveredEventId.value = null
  }
}

function handleEventClick(item: ScheduledItem, ev: MouseEvent) {
  if (isDragging.value || suppressClicks.value) {
    ev.preventDefault()
    ev.stopPropagation()
    ;(ev as unknown as { stopImmediatePropagation?: () => void })
      .stopImmediatePropagation?.()
    return
  }
  emit('select-day', item.id)
}

function handleCaptureClick(ev: MouseEvent) {
  if (isDragging.value || suppressClicks.value) {
    ev.preventDefault()
    ev.stopPropagation()
    ;(ev as unknown as { stopImmediatePropagation?: () => void })
      .stopImmediatePropagation?.()
  }
}
</script>

<template>
  <section class="flex flex-col gap-4" @click.capture="handleCaptureClick">
    <header class="flex items-center justify-between gap-3">
      <button
        type="button"
        class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/70"
        @click="prevMonth"
        aria-label="Previous month"
      >
        ‹
      </button>
      <h3 class="text-lg font-semibold text-slate-900 dark:text-white">{{ monthLabel }}</h3>
      <button
        type="button"
        class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/70"
        @click="nextMonth"
        aria-label="Next month"
      >
        ›
      </button>
    </header>

    <div class="grid grid-cols-7 gap-px rounded-2xl bg-slate-200/70 p-px dark:bg-slate-700/60">
      <div
        v-for="d in ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']"
        :key="d"
        class="bg-slate-50 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-300"
      >
        {{ d }}
      </div>

      <template v-for="(week, wi) in weeks" :key="wi">
        <div
          v-for="date in week"
          :key="date.toISOString()"
          class="group relative min-h-[110px] bg-white p-2 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200"
          :class="[
            !isSameMonth(date, visibleMonth) ? 'bg-slate-50 text-slate-400 dark:bg-slate-800/40 dark:text-slate-500' : '',
            dayKey(date) === todayIso ? 'ring-2 ring-blue-400/60 ring-offset-1 ring-offset-white dark:ring-offset-slate-900' : '',
            dragOverKey === dayKey(date) ? 'border-2 border-dashed border-blue-400 bg-blue-50/40 dark:bg-blue-500/20' : 'border border-transparent'
          ]"
          :data-date="dayKey(date)"
          @dragenter="handleDragEnter(date, $event)"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave(date)"
          @drop="handleDrop(date, $event)"
        >
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {{ date.getDate() }}
          </div>
          <button
            type="button"
            class="absolute right-2 top-2 hidden rounded-full border border-slate-200 bg-white px-1 text-xs font-semibold text-slate-500 shadow-sm transition hover:bg-slate-100 group-hover:inline-flex dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            @click.stop="emit('add-event', { date: dayKey(date) })"
            aria-label="Add event"
          >
            +
          </button>

          <ul class="mt-1 flex h-full flex-col gap-1">
            <li
              v-for="display in (displayItemsByDate[dayKey(date)] ?? [])"
              :key="display.segmentId"
              class="relative flex"
            >
              <template v-if="display.isGap && !display.isPlaceholder">
                <MultiDayBadge
                  data-testid="blocked-gap"
                  :data-gap-for="display.base.id"
                  :label="display.base.title"
                  :color="getLayerColor(display.base.layerKey)"
                  width="100%"
                  :show-label="false"
                  :is-ghost="true"
                  :ghost-style="ghostStyle"
                  :connects-left="display.connectLeft ?? false"
                  :connects-right="display.connectRight ?? false"
                  :cell-gap-px="CELL_GAP_PX"
                  :cell-padding-px="DAY_PADDING_PX"
                />
              </template>
              <template v-else-if="!display.isPlaceholder">
                <MultiDayBadge
                  :label="display.base.title"
                  :color="getLayerColor(display.base.layerKey)"
                  width="100%"
                  :show-label="display.showLabel ?? false"
                  :is-ghost="false"
                  :ghost-style="ghostStyle"
                  :connects-left="display.connectLeft ?? false"
                  :connects-right="display.connectRight ?? false"
                  :is-selected="selectedDayId === display.base.id"
                  :is-continuation="display.isContinuation"
                  :cell-gap-px="CELL_GAP_PX"
                  :cell-padding-px="DAY_PADDING_PX"
                  :highlighted="hoveredEventId === display.base.id"
                  :description="display.base.description"
                  :treat-as-head="isDragging && draggingSegmentId === display.segmentId"
                  type="button"
                  :title="display.isContinuation ? `${display.base.title} (continues)` : display.base.title"
                  draggable="true"
                  @click="handleEventClick(display.base, $event)"
                  @dragstart="
                    handleDragStart(
                      display.base,
                      display.segmentId,
                      display.globalOffset ?? 0,
                      $event
                    )
                  "
                  @dragend="resetDraggingState()"
                  @mouseenter="handleBadgeEnter(display.base.id)"
                  @mouseleave="handleBadgeLeave(display.base.id)"
                />
              </template>
              <template v-else>
                <div
                  class="h-[25.8px] w-full opacity-0 pointer-events-none"
                  aria-hidden="true"
                />
              </template>
            </li>
          </ul>
        </div>
      </template>
    </div>
  </section>
</template>


