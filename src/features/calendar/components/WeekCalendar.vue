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
  <section class="week">
    <header class="week__header">
      <button class="nav" @click="prevWeek" aria-label="Previous week">‹</button>
      <h3>{{ headerLabel }}</h3>
      <button class="nav" @click="nextWeek" aria-label="Next week">›</button>
    </header>

    <div class="week__grid">
      <div class="weekday" v-for="d in ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']" :key="d">{{ d }}</div>
      <template v-for="date in days" :key="date.toISOString()">
        <div class="cell">
          <div class="cell__date">
            {{ new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date) }}
          </div>
          <ul class="events">
            <li v-for="item in (scheduledItemsByDate[dayKey(date)] ?? [])" :key="item.id">
              <button
                type="button"
                class="event"
                :class="{ active: selectedDayId === item.id }"
                @click="emit('select-day', item.id)"
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
.week {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.week__header {
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
.week__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: var(--color-border);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  overflow: hidden;
}
.weekday {
  background: var(--color-background-soft);
  padding: 0.5rem;
  font-size: 0.8rem;
  text-align: center;
  color: var(--color-text);
  opacity: 0.85;
}
.cell {
  min-height: 140px;
  background: var(--color-background);
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.cell__date {
  font-size: 0.85rem;
  opacity: 0.75;
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
</style>


