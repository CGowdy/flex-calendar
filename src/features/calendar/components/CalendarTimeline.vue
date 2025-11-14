<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import MiniCalendar from './MiniCalendar.vue'
import CalendarQuickAddForm from './CalendarQuickAddForm.vue'
import Popover from 'primevue/popover'
import { useCalendarStore } from '@stores/useCalendarStore'

import type {
  Calendar,
  ScheduledItem,
  CreateCalendarRequest,
} from '@/features/calendar/types/calendar'

const props = defineProps<{
  calendar: Calendar
  selectedDayId: string | null
  viewDate: Date
  quickAddOpen?: boolean
  quickAddSubmitting?: boolean
}>()
const emit = defineEmits<{
  (e: 'update:viewDate', d: Date): void
  (e: 'jump', d: Date): void
  (e: 'select-day', dayId: string): void
  (e: 'toggle-quick-add'): void
  (e: 'submit-quick-add', payload: CreateCalendarRequest): void
  (e: 'cancel-quick-add'): void
}>()

const store = useCalendarStore()
const quickAddPopover = ref<InstanceType<typeof Popover> | null>(null)
const quickAddButtonRef = ref<HTMLElement | null>(null)

// Keep a local month for the mini calendar so arrow navigation doesn't move the big calendar.
const miniDate = ref(new Date(props.viewDate))
watch(
  () => props.viewDate,
  (d) => {
    miniDate.value = new Date(d)
  }
)

watch(
  () => props.quickAddOpen ?? false,
  async (open) => {
    if (open) {
      await nextTick()
      if (quickAddButtonRef.value) {
        quickAddPopover.value?.show(quickAddButtonRef.value)
      }
    } else {
      quickAddPopover.value?.hide()
    }
  }
)

function handleQuickAddToggle() {
  if (props.quickAddSubmitting) {
    return
  }
  emit('toggle-quick-add')
}

function handlePopoverHide() {
  if (props.quickAddOpen) {
    emit('cancel-quick-add')
  }
}

const startDate = computed(() => new Date(props.calendar.startDate))
const projectedEndDate = computed(() => {
  const lastItem =
    props.calendar.scheduledItems[props.calendar.scheduledItems.length - 1]
  return lastItem ? new Date(lastItem.date) : null
})

const totalScheduledItems = computed(
  () => props.calendar.scheduledItems.length
)

const completionPercent = computed(() => {
  if (!props.selectedDayId) {
    return 0
  }
  const index = props.calendar.scheduledItems.findIndex(
    (item) => item.id === props.selectedDayId
  )
  if (index < 0) {
    return 0
  }
  return Math.round(((index + 1) / props.calendar.scheduledItems.length) * 100)
})

const upcomingItems = computed<ScheduledItem[]>(() => {
  const today = new Date()
  const sorted = [...props.calendar.scheduledItems].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  const future = sorted.filter(
    (item) => new Date(item.date).getTime() >= today.setHours(0, 0, 0, 0)
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
        {{ calendar.layers.length }} layer<span v-if="calendar.layers.length !== 1">s</span>
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
        <span class="stat-label">Scheduled items</span>
        <strong>{{ totalScheduledItems }}</strong>
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
      <div class="cal-header">
        <h3>Calendars</h3>
        <div class="cal-header__actions">
          <button
            type="button"
            class="cal-add-button"
            :aria-pressed="props.quickAddOpen ?? false"
            :disabled="props.quickAddSubmitting"
            ref="quickAddButtonRef"
            @click="handleQuickAddToggle"
          >
            <span aria-hidden="true">+</span>
            <span class="sr-only">
              {{ (props.quickAddOpen ?? false) ? 'Hide quick add form' : 'Show quick add form' }}
            </span>
          </button>

          <Popover
            ref="quickAddPopover"
            :dismissable="!(props.quickAddSubmitting ?? false)"
            :show-close-icon="false"
            :focus-on-show="false"
            @hide="handlePopoverHide"
          >
            <div class="quick-add-popover" role="dialog" aria-label="Quick add calendar">
              <CalendarQuickAddForm
                :submitting="props.quickAddSubmitting"
                @submit="(payload) => emit('submit-quick-add', payload)"
                @cancel="emit('cancel-quick-add')"
              />
            </div>
          </Popover>
        </div>
      </div>
      <ul class="cal-list">
        <li v-for="layer in calendar.layers" :key="layer.key" class="cal-item">
          <label class="cal-row">
            <input
              type="checkbox"
              :checked="store.visibleLayerKeys.includes(layer.key)"
              @change="store.setLayerVisibility(layer.key, ($event.target as HTMLInputElement).checked)"
            />
            <span class="swatch" :style="{ backgroundColor: layer.color || '#64748b' }" />
            <span class="cal-name">{{ layer.name }}</span>
            <input
              class="color"
              type="color"
              :value="layer.color || '#64748b'"
              title="Color"
              @input="(e) => { const v = (e.target as HTMLInputElement).value; store.updateLayerColor(layer.key, v); store.schedulePersistLayerColor(layer.key, v, 1200) }"
              @change="(e) => { const v = (e.target as HTMLInputElement).value; store.persistLayerColor(layer.key, v) }"
            />
          </label>
        </li>
      </ul>
    </section>

    <section class="timeline__upcoming">
      <h3>Upcoming items</h3>
      <ul>
        <li
          v-for="item in upcomingItems"
          :key="item.id"
        >
          <button
            type="button"
            class="upcoming-day"
            :class="{ active: selectedDayId === item.id }"
            @click="emit('select-day', item.id)"
          >
            <span class="day-label">{{ item.label }}</span>
            <span class="day-date">{{ formatDate(new Date(item.date)) }}</span>
            <span class="chip">{{ item.layerKey }}</span>
          </button>
        </li>
      </ul>
      <p v-if="upcomingItems.length === 0" class="empty">
        You're ahead of schedule! No remaining items scheduled.
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

.cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  gap: 0.5rem;
}

.cal-header__actions {
  position: relative;
}

.cal-add-button {
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  inline-size: 1.9rem;
  block-size: 1.9rem;
  border-radius: 0.5rem;
  font-size: 1.25rem;
  line-height: 1;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.cal-add-button[aria-pressed='true'],
.cal-add-button:hover {
  border-color: rgba(37, 99, 235, 0.65);
  background: rgba(37, 99, 235, 0.12);
}

.p-popover {
  width: min(420px, 80vw);
  border-radius: 1rem;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  padding: 0;
  box-shadow: 0 30px 60px -30px rgba(15, 23, 42, 0.65);
}

.quick-add-popover {
  padding: 0.25rem;
}

.quick-add-popover :deep(.quick-add-card) {
  width: 100%;
  box-shadow: none;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
.cal-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.4rem; }
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

