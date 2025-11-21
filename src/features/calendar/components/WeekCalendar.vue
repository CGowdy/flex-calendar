<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
  Calendar,
  ScheduledItem,
  CalendarLayer,
} from '@/features/calendar/types/calendar'
import CalendarNavigation from './ui/CalendarNavigation.vue'
import CalendarDayCell from './ui/CalendarDayCell.vue'
import {
  dayKey,
  parseIsoDate,
  addDays,
  normalizeDate,
  startOfWeek,
  isWeekendDay,
} from '@/features/calendar/composables/useDateUtils'
import { buildExceptionLookup } from '@/features/calendar/composables/useExceptionLookup'

const props = defineProps<{
  calendar: Calendar
  selectedDayId: string | null
  visibleLayerKeys?: string[]
  viewDate?: Date
  ghostStyle?: 'connected' | 'dashed'
}>()

const ghostStyle = computed(() => props.ghostStyle ?? 'connected')
const CELL_GAP_PX = 8.6
const DAY_PADDING_PX = 0
const hoveredEventId = ref<string | null>(null)

const emit = defineEmits<{
  (event: 'select-day', dayId: string): void
  (event: 'update:viewDate', d: Date): void
  (event: 'add-event', payload: { date: string }): void
}>()

const visibleStart = ref(startOfWeek(props.viewDate ?? new Date()))
watch(
  () => props.viewDate,
  (d) => {
    if (!d) return
    const normalized = startOfWeek(new Date(d))
    if (normalized.getTime() !== visibleStart.value.getTime()) {
      visibleStart.value = normalized
    }
  },
  { immediate: true }
)
watch(
  () => visibleStart.value,
  (val) => {
    emit('update:viewDate', new Date(val))
  },
  { immediate: true }
)
const days = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(visibleStart.value)
    d.setDate(d.getDate() + i)
    return d
  })
)

function nextWeek() {
  const d = new Date(visibleStart.value)
  d.setDate(d.getDate() + 7)
  visibleStart.value = startOfWeek(d)
}
function prevWeek() {
  const d = new Date(visibleStart.value)
  d.setDate(d.getDate() - 7)
  visibleStart.value = startOfWeek(d)
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

function splitIntoSegments(
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
  const entries: SegmentedItem[] = []
  for (const item of props.calendar.scheduledItems) {
    if (allow && !allow.has(item.layerKey)) continue
    const segments = splitIntoSegments(item, includeWeekends)
    const startDate = normalizeDate(new Date(item.date))
    const lastSegment = segments[segments.length - 1]
    const totalSpan = lastSegment ? lastSegment.offset + lastSegment.spanDays : 1
    const endDate = addDays(startDate, Math.max(totalSpan, 1) - 1)
    entries.push({ base: item, segments, startDate, endDate, totalSpan })
  }
  return entries
})

const laneAssignments = computed(() => {
  const laneEnds: number[] = []
  const map = new Map<string, number>()
  const sorted = [...segmentedItems.value].sort((a, b) => {
    const startDiff = a.startDate.getTime() - b.startDate.getTime()
    if (startDiff !== 0) return startDiff
    const endDiff = b.endDate.getTime() - a.endDate.getTime()
    if (endDiff !== 0) return endDiff
    return a.base.title.localeCompare(b.base.title)
  })
  for (const item of sorted) {
    let lane = 0
    while (laneEnds[lane] !== undefined && item.startDate.getTime() <= laneEnds[lane]!) {
      lane++
    }
    laneEnds[lane] = item.endDate.getTime()
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
  for (const entry of segmentedItems.value) {
    const lane = laneAssignments.value.get(entry.base.id) ?? 0
    entry.segments.forEach((segment, segmentIndex) => {
      const segmentStart = parseIsoDate(segment.startDateIso)
      const hasLaterRealSegment = entry.segments.slice(segmentIndex + 1).some((seg) => !seg.isGap)
      for (let dayOffset = 0; dayOffset < segment.spanDays; dayOffset++) {
        const currentDate = addDays(segmentStart, dayOffset)
        const iso = dayKey(currentDate)
        const isStartOfSegment = dayOffset === 0
        const spanDays = isStartOfSegment ? segment.spanDays : 1
        const isPlaceholder = false
        const absoluteIndex = segment.offset + dayOffset
        const connectLeft = absoluteIndex > 0
        const connectRight = absoluteIndex < (entry.totalSpan ?? spanDays) - 1
        pushEntry(iso, {
          segmentId: `${entry.base.id}-${segment.startDateIso}${segment.isGap ? '-gap' : ''}-${dayOffset}`,
          base: entry.base,
          spanDays,
          isContinuation: segment.isGap ? true : segment.offset > 0 || !isStartOfSegment,
          isGap: segment.isGap,
          isPlaceholder,
          lane,
          startOrder: entry.startDate.getTime(),
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

function handleBadgeEnter(eventId: string) {
  hoveredEventId.value = eventId
}

function handleBadgeLeave(eventId: string) {
  if (hoveredEventId.value === eventId) {
    hoveredEventId.value = null
  }
}

const headerLabel = computed(() => {
  const fmt = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const end = new Date(visibleStart.value); end.setDate(end.getDate() + 6)
  return `${fmt.format(visibleStart.value)} – ${fmt.format(end)}`
})
</script>

<template>
  <section class="flex flex-col gap-4">
    <CalendarNavigation
      :label="headerLabel"
      :prev-label="'Previous week'"
      :next-label="'Next week'"
      :on-prev="prevWeek"
      :on-next="nextWeek"
    />

    <div class="grid grid-cols-7 gap-px rounded-2xl bg-slate-200/70 p-px dark:bg-slate-700/60">
      <div
        v-for="d in ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']"
        :key="d"
        class="bg-slate-50 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-300"
      >
        {{ d }}
      </div>
      <CalendarDayCell
        v-for="date in days"
        :key="date.toISOString()"
        :date="date"
        :display-items="displayItemsByDate[dayKey(date)] ?? []"
        :selected-day-id="selectedDayId"
        :hovered-event-id="hoveredEventId"
        :dragging-segment-id="null"
        :is-dragging="false"
        :drag-over-key="null"
        :today-iso="new Date().toISOString().slice(0, 10)"
        :is-same-month="true"
        :visible-month="visibleStart"
        :ghost-style="ghostStyle"
        :cell-gap-px="CELL_GAP_PX"
        :cell-padding-px="DAY_PADDING_PX"
        :get-layer-color="getLayerColor"
        class="min-h-[140px]"
        @select-day="(dayId) => emit('select-day', dayId)"
        @add-event="(payload) => emit('add-event', payload)"
        @badge-enter="handleBadgeEnter"
        @badge-leave="handleBadgeLeave"
      />
    </div>
  </section>
</template>


