<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import MiniCalendar from './MiniCalendar.vue'
import { useCalendarStore } from '@stores/useCalendarStore'

import type { Calendar, CalendarDay } from '@/features/calendar/types/calendar'

const props = defineProps<{
  calendar: Calendar
  selectedDayId: string | null
  viewDate: Date
}>()
const emit = defineEmits<{
  (e: 'update:viewDate', d: Date): void
  (e: 'jump', d: Date): void
  (e: 'select-day', dayId: string): void
}>()

const store = useCalendarStore()

// Keep a local month for the mini calendar so arrow navigation doesn't move the big calendar.
const miniDate = ref(new Date(props.viewDate))
watch(
  () => props.viewDate,
  (d) => {
    miniDate.value = new Date(d)
  }
)

const startDate = computed(() => new Date(props.calendar.startDate))
const projectedEndDate = computed(() => {
  const lastDay = props.calendar.days[props.calendar.days.length - 1]
  return lastDay ? new Date(lastDay.date) : null
})

const totalDays = computed(() => props.calendar.totalDays)

const completionPercent = computed(() => {
  if (!props.selectedDayId) {
    return 0
  }
  const index = props.calendar.days.findIndex(
    (day) => day.id === props.selectedDayId
  )
  if (index < 0) {
    return 0
  }
  return Math.round(((index + 1) / props.calendar.days.length) * 100)
})

const upcomingDays = computed<CalendarDay[]>(() => {
  const today = new Date()
  const sorted = [...props.calendar.days].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  const future = sorted.filter(
    (day) => new Date(day.date).getTime() >= today.setHours(0, 0, 0, 0)
  )
  return future.slice(0, 6)
})

function formatDate(date: Date | null): string {
  if (!date) {
    return '—'
  }
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

</script>

<template>
  <aside class="timeline">
    <header class="timeline__header">
      <h2>{{ calendar.name }}</h2>
      <p class="timeline__meta">
        {{ calendar.groupings.length }} grouping track<span v-if="calendar.groupings.length !== 1">s</span>
      </p>
    </header>

    <section class="timeline__stats">
      <article class="stat-card">
        <span class="stat-label">Start date</span>
        <strong>{{ formatDate(startDate) }}</strong>
      </article>

      <article class="stat-card">
        <span class="stat-label">Projected end</span>
        <strong>{{ formatDate(projectedEndDate) }}</strong>
      </article>

      <article class="stat-card">
        <span class="stat-label">Total lessons</span>
        <strong>{{ totalDays }}</strong>
      </article>
    </section>

    <section class="timeline__progress">
      <span>Progress</span>
      <div class="progress-bar" role="progressbar" :aria-valuenow="completionPercent" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar__value" :style="{ width: `${completionPercent}%` }" />
      </div>
      <span class="progress-label">
        {{ completionPercent }}% complete
      </span>
    </section>

    <section class="timeline__tools">
      <MiniCalendar
        :model-value="miniDate"
        @update:model-value="(d) => (miniDate = d)"
        @select="(d) => { emit('update:viewDate', d); emit('jump', d) }"
      />
    </section>

    <section class="timeline__calendars">
      <h3>Calendars</h3>
      <ul class="cal-list">
        <li v-for="g in calendar.groupings" :key="g.key" class="cal-item">
          <label class="cal-row">
            <input
              type="checkbox"
              :checked="store.visibleGroupingKeys.includes(g.key)"
              @change="store.setGroupingVisibility(g.key, ($event.target as HTMLInputElement).checked)"
            />
            <span class="swatch" :style="{ backgroundColor: g.color || '#64748b' }" />
            <span class="cal-name">{{ g.name }}</span>
            <input
              class="color"
              type="color"
              :value="g.color || '#64748b'"
              title="Color"
              @input="(e) => { const v = (e.target as HTMLInputElement).value; store.updateGroupingColor(g.key, v); store.schedulePersistGroupingColor(g.key, v, 1200) }"
              @change="(e) => { const v = (e.target as HTMLInputElement).value; store.persistGroupingColor(g.key, v) }"
            />
          </label>
        </li>
      </ul>
    </section>

    <section class="timeline__upcoming">
      <h3>Upcoming lessons</h3>
      <ul>
        <li
          v-for="day in upcomingDays"
          :key="day.id"
        >
          <button
            type="button"
            class="upcoming-day"
            :class="{ active: selectedDayId === day.id }"
            @click="emit('select-day', day.id)"
          >
            <span class="day-label">{{ day.label }}</span>
            <span class="day-date">{{ formatDate(new Date(day.date)) }}</span>
            <span class="chip">{{ day.groupingKey }}</span>
          </button>
        </li>
      </ul>
      <p v-if="upcomingDays.length === 0" class="empty">
        You're ahead of schedule! No remaining lessons scheduled.
      </p>
    </section>
  </aside>
</template>

<style scoped>
.timeline {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.25rem;
  border-radius: 1rem;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
}

.timeline__header h2 {
  font-size: 1.15rem;
  margin-bottom: 0.25rem;
}

.timeline__meta {
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.75;
}

.timeline__stats {
  display: grid;
  gap: 0.75rem;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  border-radius: 0.75rem;
  background: rgba(37, 99, 235, 0.12);
}

.stat-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text);
  opacity: 0.75;
}

.stat-card strong {
  font-size: 1rem;
}

.timeline__progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-bar {
  height: 0.65rem;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  overflow: hidden;
}

.progress-bar__value {
  height: 100%;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transition: width 0.3s ease;
}

.progress-label {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.85;
}

.timeline__upcoming ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.5rem;
}

.timeline__tools {
  border-top: 1px solid var(--color-border);
  padding-top: 0.75rem;
}

.timeline__calendars {
  border-top: 1px solid var(--color-border);
  padding-top: 0.75rem;
  display: grid;
  gap: 0.5rem;
}
.cal-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.4rem; }
.cal-item {}
.cal-row { display: grid; grid-template-columns: auto auto 1fr auto; gap: 0.5rem; align-items: center; }
.swatch { width: 0.8rem; height: 0.8rem; border-radius: 2px; border: 1px solid var(--color-border); }
.color { inline-size: 2rem; block-size: 1.2rem; padding: 0; border: none; background: transparent; }

.upcoming-day {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  border-radius: 0.75rem;
  border: 1px solid transparent;
  background: var(--color-background-mute);
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.upcoming-day:hover {
  border-color: rgba(37, 99, 235, 0.35);
  background: rgba(37, 99, 235, 0.12);
}

.upcoming-day.active {
  border-color: rgba(37, 99, 235, 0.6);
  background: rgba(37, 99, 235, 0.2);
}

.day-label {
  font-weight: 600;
  font-size: 0.95rem;
  text-align: left;
}

.day-date {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.85;
}

.chip {
  font-size: 0.75rem;
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.empty {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.75;
  margin-top: 0.75rem;
  text-align: center;
}

@media (max-width: 640px) {
  .timeline {
    padding: 1rem;
  }
}
</style>

