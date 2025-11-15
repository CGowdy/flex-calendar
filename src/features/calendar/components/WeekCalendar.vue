<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Calendar, ScheduledItem } from '@/features/calendar/types/calendar'

const props = defineProps<{
  calendar: Calendar
  selectedDayId: string | null
  visibleLayerKeys?: string[]
}>()

const emit = defineEmits<{
  (event: 'select-day', dayId: string): void
}>()

const startOfWeek = (d: Date) => {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

const visibleStart = ref(startOfWeek(new Date()))
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

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

const scheduledItemsByDate = computed<Record<string, ScheduledItem[]>>(() => {
  const map: Record<string, ScheduledItem[]> = {}
  const allow = props.visibleLayerKeys ? new Set(props.visibleLayerKeys) : null
  for (const item of props.calendar.scheduledItems) {
    if (allow && !allow.has(item.layerKey)) continue
    const key = dayKey(new Date(item.date))
    if (!map[key]) map[key] = []
    map[key]!.push(item)
  }
  return map
})

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
    <header class="flex items-center justify-between gap-3">
      <button
        type="button"
        class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/70"
        @click="prevWeek"
        aria-label="Previous week"
      >
        ‹
      </button>
      <h3 class="text-lg font-semibold text-slate-900 dark:text-white">{{ headerLabel }}</h3>
      <button
        type="button"
        class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/70"
        @click="nextWeek"
        aria-label="Next week"
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
      <template v-for="date in days" :key="date.toISOString()">
        <div class="min-h-[140px] bg-white p-2 dark:bg-slate-900">
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {{ new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date) }}
          </div>
          <ul class="mt-1 flex flex-col gap-1">
            <li v-for="item in (scheduledItemsByDate[dayKey(date)] ?? [])" :key="item.id">
              <button
                type="button"
                class="flex w-full items-center gap-2 rounded-md border border-transparent bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-200 dark:bg-slate-800/60 dark:text-slate-200"
                :class="{ 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/20 dark:text-blue-100': selectedDayId === item.id }"
                @click="emit('select-day', item.id)"
              >
                <span
                  class="h-2 w-2 rounded-full"
                  :style="{ backgroundColor: (calendar.layers.find(layer => layer.key === item.layerKey)?.color) || '#2563eb' }"
                />
                <span class="truncate">{{ item.title }}</span>
                <span v-if="item.description" class="hidden text-[0.65rem] text-slate-500 dark:text-slate-400 lg:inline">
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


