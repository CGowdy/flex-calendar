<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

import type {
  Calendar,
  CalendarDay,
  ShiftCalendarDaysRequest,
} from '@/features/calendar/types/calendar'

const props = defineProps<{
  open: boolean
  calendar: Calendar | null
  day: CalendarDay | null
  autoShiftGroupingKeys: string[]
  busy?: boolean
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'shift', payload: ShiftCalendarDaysRequest): void
}>()

const state = reactive({
  shiftByDays: 1,
  groupingSelections: [] as string[],
})

const groupingOptions = computed(() => props.calendar?.groupings ?? [])

watch(
  () => props.day,
  (day) => {
    if (!day) {
      state.groupingSelections = []
      return
    }
    const defaults = new Set(props.autoShiftGroupingKeys)
    defaults.add(day.groupingKey)
    state.groupingSelections = Array.from(defaults)
    state.shiftByDays = 1
  },
  { immediate: true }
)

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

function handleShift(sign: number) {
  if (!props.day) return
  emit('shift', {
    dayId: props.day.id,
    shiftByDays: sign,
    groupingKeys: state.groupingSelections,
  })
}

function handleSubmit() {
  if (!props.day || state.shiftByDays === 0 || props.busy) return
  emit('shift', {
    dayId: props.day.id,
    shiftByDays: state.shiftByDays,
    groupingKeys: state.groupingSelections,
  })
}
</script>

<template>
  <transition name="drawer">
    <aside
      v-if="open && day"
      class="drawer"
      role="dialog"
      aria-modal="true"
    >
      <template v-if="day">
        <header class="drawer__header">
          <div>
            <h2>{{ day!.label }}</h2>
            <p class="drawer__meta">
              {{ formatDate(day!.date) }} · Track:
              {{ calendar?.groupings.find((group) => group.key === day!.groupingKey)?.name ?? day!.groupingKey }}
            </p>
          </div>
          <button
            type="button"
            class="icon-button"
            :disabled="busy"
            @click="emit('close')"
            aria-label="Close day details"
          >
            ✕
          </button>
        </header>

        <section class="drawer__body">
          <article class="lesson-card">
            <h3>Lesson details</h3>
            <ul>
              <li
                v-for="event in day!.events"
                :key="event.id"
              >
                <strong>{{ event.title }}</strong>
                <p v-if="event.description">{{ event.description }}</p>
                <span class="duration">
                  Duration: {{ event.durationDays }} day{{ event.durationDays === 1 ? '' : 's' }}
                </span>
              </li>
            </ul>
            <p v-if="day!.events.length === 0">No events recorded for this day.</p>
          </article>

          <article class="shift-card">
            <header class="shift-card__header">
              <h3>Reschedule lessons</h3>
              <p>Select the tracks that should adjust with this change.</p>
            </header>

            <div class="quick-actions">
              <button
                type="button"
                class="chip-button"
                :disabled="busy"
                @click="handleShift(-1)"
              >
                Move up 1 day
              </button>
              <button
                type="button"
                class="chip-button"
                :disabled="busy"
                @click="handleShift(1)"
              >
                Delay 1 day
              </button>
            </div>

            <form class="shift-form" @submit.prevent="handleSubmit">
              <label class="field">
                <span>Shift by (days)</span>
                <input
                  v-model.number="state.shiftByDays"
                  type="number"
                  min="-30"
                  max="30"
                  :disabled="busy"
                />
              </label>

              <fieldset class="grouping-fieldset">
                <legend>Grouping adjustments</legend>
                <ul>
                  <li
                    v-for="group in groupingOptions"
                    :key="group.key"
                  >
                    <label class="toggle">
                      <input
                        type="checkbox"
                        :value="group.key"
                        v-model="state.groupingSelections"
                        :disabled="busy"
                      />
                      <span>{{ group.name }}</span>
                    </label>
                  </li>
                </ul>
              </fieldset>

              <button
                type="submit"
                class="primary-button"
                :disabled="busy || state.shiftByDays === 0"
              >
                <span v-if="busy">Updating…</span>
                <span v-else>Apply shift</span>
              </button>
            </form>
          </article>
        </section>
      </template>
    </aside>
  </transition>
</template>

<style scoped>
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: min(360px, 100%);
  height: 100%;
  background: var(--color-background);
  border-left: 1px solid var(--color-border);
  box-shadow: -20px 0 40px -30px rgba(15, 23, 42, 0.4);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  z-index: 40;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.25s ease, opacity 0.2s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

.drawer__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.drawer__meta {
  font-size: 0.85rem;
  color: rgba(15, 23, 42, 0.7);
}

.icon-button {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0.35rem;
  border-radius: 0.5rem;
}

.icon-button:hover:not(:disabled) {
  background: rgba(15, 23, 42, 0.08);
}

.drawer__body {
  flex: 1 1 auto;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.lesson-card,
.shift-card {
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  padding: 1rem;
  background: var(--color-background-soft);
}

.lesson-card ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.75rem;
}

.lesson-card strong {
  display: block;
}

.lesson-card p {
  font-size: 0.85rem;
  color: rgba(15, 23, 42, 0.75);
}

.duration {
  font-size: 0.75rem;
  color: rgba(37, 99, 235, 0.8);
}

.shift-card__header h3 {
  margin-bottom: 0.35rem;
}

.shift-card__header p {
  font-size: 0.85rem;
  color: rgba(15, 23, 42, 0.7);
}

.quick-actions {
  display: flex;
  gap: 0.5rem;
  margin: 0.75rem 0;
}

.chip-button {
  flex: 1 1 auto;
  border: 1px solid rgba(37, 99, 235, 0.4);
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  cursor: pointer;
}

.shift-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field span {
  font-size: 0.85rem;
  font-weight: 600;
}

.field input {
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  padding: 0.55rem 0.75rem;
  font-size: 0.95rem;
}

.grouping-fieldset {
  border: none;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0;
}

.grouping-fieldset legend {
  font-size: 0.85rem;
  font-weight: 600;
}

.grouping-fieldset ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.35rem;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.primary-button {
  align-self: flex-end;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  padding: 0.55rem 1.2rem;
  border-radius: 0.75rem;
  border: none;
  cursor: pointer;
  font-weight: 600;
}

.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

@media (max-width: 640px) {
  .drawer {
    width: 100%;
  }
}
</style>

