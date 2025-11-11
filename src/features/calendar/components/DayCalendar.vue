<script setup lang="ts">
import { computed } from 'vue'
import type { Calendar, CalendarDay } from '../types/calendar'

const props = defineProps<{
  calendar: Calendar
  selectedDayId: string | null
}>()

const emit = defineEmits<{
  (event: 'select-day', dayId: string): void
}>()

const selectedDay = computed<CalendarDay | null>(() => {
  if (!props.selectedDayId) return null
  return props.calendar.days.find((d) => d.id === props.selectedDayId) ?? null
})

const dayLabel = computed(() => {
  const date = selectedDay.value ? new Date(selectedDay.value.date) : null
  return date
    ? new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(date)
    : 'No day selected'
})
</script>

<template>
  <section class="day">
    <header class="day__header">
      <h3>{{ dayLabel }}</h3>
    </header>

    <div v-if="selectedDay" class="day__content">
      <div class="card">
        <div class="row">
          <span class="muted">Label</span>
          <strong>{{ selectedDay.label }}</strong>
        </div>
        <div class="row">
          <span class="muted">Track</span>
          <strong>{{ selectedDay.groupingKey }}</strong>
        </div>
        <div class="row">
          <span class="muted">Date</span>
          <strong>{{ new Date(selectedDay.date).toLocaleDateString() }}</strong>
        </div>
      </div>

      <div class="card">
        <h4>Events</h4>
        <ul class="events">
          <li v-for="ev in selectedDay.events" :key="ev.id" class="event">
            <strong>{{ ev.title }}</strong>
            <p v-if="ev.description">{{ ev.description }}</p>
          </li>
        </ul>
      </div>
    </div>

    <p v-else class="muted">Select a day to see details.</p>
  </section>
</template>

<style scoped>
.day {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.day__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.day__content {
  display: grid;
  gap: 0.75rem;
}
.card {
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  border-radius: 0.75rem;
  padding: 0.75rem;
}
.row {
  display: flex;
  justify-content: space-between;
  padding: 0.35rem 0;
}
.muted {
  color: var(--color-text);
  opacity: 0.75;
}
.events {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.4rem;
}
.event {
  border: 1px solid var(--color-border);
  background: var(--color-background);
  border-radius: 0.5rem;
  padding: 0.5rem;
}
</style>


