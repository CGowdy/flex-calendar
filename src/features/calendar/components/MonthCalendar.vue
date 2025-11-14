<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Calendar, ScheduledItem } from '@/features/calendar/types/calendar'

const props = defineProps<{
  calendar: Calendar
  selectedDayId: string | null
  viewDate?: Date
  visibleLayerKeys?: string[]
}>()

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

const scheduledItemsByDate = computed<Record<string, ScheduledItem[]>>(() => {
  const map: Record<string, ScheduledItem[]> = {}
  const allow = props.visibleLayerKeys
    ? new Set(props.visibleLayerKeys)
    : null
  for (const item of props.calendar.scheduledItems) {
    if (allow && !allow.has(item.layerKey)) continue
    const key = dayKey(new Date(item.date))
    if (!map[key]) map[key] = []
    map[key]!.push(item)
  }
  return map
})

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

function handleDragStart(item: ScheduledItem, ev: DragEvent) {
  if (!ev.dataTransfer) return
  isDragging.value = true
  const payload = JSON.stringify({
    scheduledItemId: item.id,
    date: item.date,
    layerKey: item.layerKey,
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

function handleDrop(date: Date, ev: DragEvent) {
  ev.preventDefault()
  const payload = ev.dataTransfer?.getData('application/json')
  const fallback = !payload ? ev.dataTransfer?.getData('text/plain') : null
  if (!payload) return
  try {
    const data = JSON.parse(payload || (fallback ?? '')) as {
      scheduledItemId: string
      date: string
      layerKey?: string
    }
    const delta = daysBetween(data.date, date)
    if (delta !== 0) {
      emit('shift-day', {
        scheduledItemId: data.scheduledItemId,
        shiftByDays: delta,
        layerKeys: data.layerKey ? [data.layerKey] : undefined,
      })
    }
  } catch {
    // ignore bad payloads
  }
  dragOverCounts.value[dayKey(date)] = 0
  dragOverKey.value = null
  isDragging.value = false
  // Prevent synthetic click firing after drop
  suppressClicks.value = true
  setTimeout(() => {
    suppressClicks.value = false
  }, 300)
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
  <section class="month" @click.capture="handleCaptureClick">
    <header class="month__header">
      <button class="nav" @click="prevMonth" aria-label="Previous month">‹</button>
      <h3>{{ monthLabel }}</h3>
      <button class="nav" @click="nextMonth" aria-label="Next month">›</button>
    </header>

    <div class="month__grid">
      <div class="weekday" v-for="d in ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']" :key="d">{{ d }}</div>

      <template v-for="(week, wi) in weeks" :key="wi">
        <div
          v-for="date in week"
          :key="date.toISOString()"
          class="cell"
          :class="{
            'cell--muted': !isSameMonth(date, visibleMonth),
            'cell--today': dayKey(date) === todayIso,
            'cell--drag-over': dragOverKey === dayKey(date)
          }"
          @dragenter="handleDragEnter(date, $event)"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave(date)"
          @drop="handleDrop(date, $event)"
        >
          <div class="cell__date">{{ date.getDate() }}</div>

          <ul class="events">
            <li
              v-for="item in (scheduledItemsByDate[dayKey(date)] ?? [])"
              :key="item.id"
            >
              <button
                type="button"
                class="event"
                :class="{ active: selectedDayId === item.id }"
                @click="handleEventClick(item, $event)"
                :title="item.title"
                draggable="true"
                @dragstart="handleDragStart(item, $event)"
                @dragend="isDragging = false"
              >
                <span class="dot"
                  :style="{ backgroundColor: (calendar.layers.find(layer => layer.key === item.layerKey)?.color) || '#2563eb' }"
                />
                <span class="event__label">{{ item.title }}</span>
                <span v-if="item.description" class="event__title">{{ item.description }}</span>
              </button>
            </li>
          </ul>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.month {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.month__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav {
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  padding: 0.25rem 0.6rem;
  border-radius: 0.5rem;
  cursor: pointer;
}

.month__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: var(--color-border);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  overflow: hidden;
}

.weekday {
  grid-column: span 1;
  background: var(--color-background-soft);
  padding: 0.5rem;
  font-size: 0.8rem;
  text-align: center;
  color: var(--color-text);
  opacity: 0.85;
}

.cell {
  min-height: 110px;
  background: var(--color-background);
  padding: 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.cell--muted {
  background: var(--color-background-soft);
}

.cell--today {
  outline: 2px solid rgba(37, 99, 235, 0.55);
  outline-offset: -2px;
}

.cell--drag-over {
  outline: 2px dashed rgba(37, 99, 235, 0.7);
  outline-offset: -2px;
  background: rgba(37, 99, 235, 0.08);
}

.cell__date {
  font-size: 0.8rem;
  opacity: 0.7;
}

.events {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.event {
  width: 100%;
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
  border: 1px solid transparent;
  background: var(--color-background-mute);
  color: var(--color-text);
  border-radius: 0.5rem;
  padding: 0.2rem 0.35rem;
  cursor: pointer;
  text-align: left;
}

.event.active {
  border-color: rgba(37, 99, 235, 0.5);
  background: rgba(37, 99, 235, 0.15);
}

.dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  display: inline-block;
}

.event__label {
  font-size: 0.8rem;
  font-weight: 600;
}

.event__title {
  font-size: 0.75rem;
  opacity: 0.85;
}

@media (max-width: 768px) {
  .cell { min-height: 88px; }
  .event__title { display: none; }
}
</style>


