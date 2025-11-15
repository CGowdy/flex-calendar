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
          class="min-h-[110px] bg-white p-2 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200"
          :class="[
            !isSameMonth(date, visibleMonth) ? 'bg-slate-50 text-slate-400 dark:bg-slate-800/40 dark:text-slate-500' : '',
            dayKey(date) === todayIso ? 'ring-2 ring-blue-400/60 ring-offset-1 ring-offset-white dark:ring-offset-slate-900' : '',
            dragOverKey === dayKey(date) ? 'border-2 border-dashed border-blue-400 bg-blue-50/40 dark:bg-blue-500/20' : 'border border-transparent'
          ]"
          @dragenter="handleDragEnter(date, $event)"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave(date)"
          @drop="handleDrop(date, $event)"
        >
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {{ date.getDate() }}
          </div>

          <ul class="mt-1 flex flex-col gap-1">
            <li
              v-for="item in (scheduledItemsByDate[dayKey(date)] ?? [])"
              :key="item.id"
            >
              <button
                type="button"
                class="flex w-full items-center gap-2 rounded-md border border-transparent bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-200 dark:bg-slate-800/60 dark:text-slate-200"
                :class="{ 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/20 dark:text-blue-100': selectedDayId === item.id }"
                @click="handleEventClick(item, $event)"
                :title="item.title"
                draggable="true"
                @dragstart="handleDragStart(item, $event)"
                @dragend="isDragging = false"
              >
                <span
                  class="h-2 w-2 rounded-full"
                  :style="{ backgroundColor: (calendar.layers.find(layer => layer.key === item.layerKey)?.color) || '#2563eb' }"
                />
                <span class="truncate">{{ item.title }}</span>
                <span v-if="item.description" class="hidden text-[0.65rem] text-slate-500 dark:text-slate-400 md:inline">
                  {{ item.description }}
                </span>
              </button>
            </li>
          </ul>
        </div>
      </template>
    </div>
  </section>
</template>


