<script setup lang="ts">
import { computed } from 'vue'
import type { Calendar, ScheduledItem } from '@/features/calendar/types/calendar'

const props = defineProps<{
  calendar: Calendar | null
  viewMode: 'month' | 'week' | 'day' | 'board'
  viewDate: Date
  visibleLayerKeys: string[]
}>()

const visibleLayerSet = computed(() =>
  props.visibleLayerKeys.length > 0 ? new Set(props.visibleLayerKeys) : null
)

const layerLookup = computed<Record<string, string>>(() => {
  if (!props.calendar) return {}
  return Object.fromEntries(props.calendar.layers.map((layer) => [layer.key, layer.name]))
})

const eventsByDate = computed<Record<string, ScheduledItem[]>>(() => {
  const map: Record<string, ScheduledItem[]> = {}
  if (!props.calendar) return map
  for (const item of props.calendar.scheduledItems) {
    if (visibleLayerSet.value && !visibleLayerSet.value.has(item.layerKey)) continue
    const key = new Date(item.date).toISOString().slice(0, 10)
    if (!map[key]) map[key] = []
    map[key]!.push(item)
  }
  return map
})

const weekDays = computed(() => {
  const base = new Date(props.viewDate ?? new Date())
  const start = new Date(base)
  start.setDate(start.getDate() - start.getDay())
  start.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    const key = date.toISOString().slice(0, 10)
    return {
      date,
      key,
      events: (eventsByDate.value[key] ?? []).slice().sort((a, b) =>
        a.title.localeCompare(b.title)
      ),
    }
  })
})

const showLayerName = computed(() => props.visibleLayerKeys.length !== 1)
</script>

<template>
  <section class="print-view hidden">
    <header class="mb-4 border-b border-slate-300 pb-2">
      <h1 class="text-2xl font-semibold text-slate-900">
        Flex Calendar — {{ props.viewMode.charAt(0).toUpperCase() + props.viewMode.slice(1) }} view
      </h1>
      <p class="text-sm text-slate-600">
        Week of
        {{
          new Intl.DateTimeFormat(undefined, {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }).format(weekDays[0]?.date ?? new Date())
        }}
      </p>
      <p class="mt-1 text-xs text-slate-500">
        Layers:
        {{
          props.visibleLayerKeys.length > 0
            ? props.visibleLayerKeys.map((key) => layerLookup[key] ?? key).join(', ')
            : 'All'
        }}
      </p>
    </header>

    <div class="space-y-4">
      <article
        v-for="day in weekDays"
        :key="day.key"
        class="rounded-xl border border-slate-200 p-4"
      >
        <h2 class="text-base font-semibold text-slate-900">
          {{
            new Intl.DateTimeFormat(undefined, {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            }).format(day.date)
          }}
        </h2>
        <ul class="mt-2 space-y-1 text-sm text-slate-700">
          <li v-if="day.events.length === 0" class="text-slate-400">No events.</li>
          <li v-for="event in day.events" :key="event.id">
            <strong>{{ event.title }}</strong>
            <span v-if="showLayerName" class="text-slate-500">
              — {{ layerLookup[event.layerKey] ?? event.layerKey }}
            </span>
          </li>
        </ul>
      </article>
    </div>
  </section>
</template>

<style scoped>
@media print {
  .print-view {
    display: block !important;
    padding: 2rem;
    color: #0f172a;
    background: white;
  }
}
</style>


