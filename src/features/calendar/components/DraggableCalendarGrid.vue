<script setup lang="ts">
import { computed } from 'vue'

import type { Calendar, CalendarDay } from '../types/calendar'

const props = defineProps<{
  calendar: Calendar
  selectedDayId: string | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'select-day', dayId: string): void
  (
    event: 'shift-day',
    payload: { dayId: string; shiftByDays: number; groupingKeys?: string[] }
  ): void
}>()

const groupedDays = computed(() => {
  const groups = new Map<string, CalendarDay[]>()
  for (const day of props.calendar.days) {
    if (!groups.has(day.groupingKey)) {
      groups.set(day.groupingKey, [])
    }
    groups.get(day.groupingKey)!.push(day)
  }

  for (const [key, days] of groups.entries()) {
    days.sort(
      (a, b) => a.groupingSequence - b.groupingSequence
    )
    groups.set(key, days)
  }

  return groups
})

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso))
}

function handleShift(day: CalendarDay, delta: number) {
  emit('shift-day', {
    dayId: day.id,
    shiftByDays: delta,
    groupingKeys: [day.groupingKey],
  })
}
</script>

<template>
  <div class="grid">
    <section
      v-for="[groupingKey, days] in groupedDays"
      :key="groupingKey"
      class="grid-column"
    >
      <header class="column-header">
        <h3>{{ calendar.groupings.find((group) => group.key === groupingKey)?.name ?? groupingKey }}</h3>
        <span class="column-subtitle">
          {{ days.length }} day{{ days.length === 1 ? '' : 's' }}
        </span>
      </header>

      <ul class="day-list">
        <li
          v-for="day in days"
          :key="day.id"
        >
          <article
            class="day-card"
            :class="{ active: selectedDayId === day.id }"
          >
            <button
              type="button"
              class="day-card__main"
              :disabled="disabled"
              @click="emit('select-day', day.id)"
            >
              <div class="day-title">
                <span class="day-label">{{ day.label }}</span>
                <span class="day-date">{{ formatDate(day.date) }}</span>
              </div>

              <p v-if="day.events.length > 0" class="day-event">
                {{ day.events[0]?.title }}
              </p>
            </button>

            <div class="day-actions">
              <button
                type="button"
                class="action-button"
                :disabled="disabled"
                @click="handleShift(day, -1)"
                aria-label="Move lesson earlier by one day"
              >
                −1 day
              </button>
              <button
                type="button"
                class="action-button"
                :disabled="disabled"
                @click="handleShift(day, 1)"
                aria-label="Move lesson later by one day"
              >
                +1 day
              </button>
            </div>
          </article>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.grid-column {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  padding: 1rem;
  max-height: 70vh;
  overflow-y: auto;
}

.column-header h3 {
  margin-bottom: 0.25rem;
}

.column-subtitle {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.75;
}

.day-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.day-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: 1px solid transparent;
  border-radius: 0.9rem;
  background: var(--color-background-mute);
  padding: 0.65rem;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.day-card.active {
  border-color: rgba(37, 99, 235, 0.5);
  background: rgba(37, 99, 235, 0.15);
}

.day-card__main {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  align-items: flex-start;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.day-card__main:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.day-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 0.75rem;
}

.day-label {
  font-weight: 600;
}

.day-date {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.75;
}

.day-event {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.9;
}

.day-actions {
  display: flex;
  gap: 0.5rem;
}

.action-button {
  flex: 1 1 auto;
  border: 1px solid rgba(37, 99, 235, 0.4);
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
  padding: 0.35rem 0.5rem;
  border-radius: 0.65rem;
  cursor: pointer;
  font-size: 0.8rem;
  transition: background-color 0.2s ease;
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-button:not(:disabled):hover {
  background: rgba(37, 99, 235, 0.15);
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>

