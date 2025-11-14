<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import MiniCalendar from './MiniCalendar.vue'
import LayerQuickAddForm from './LayerQuickAddForm.vue'
import Popover from 'primevue/popover'
import { useCalendarStore } from '@stores/useCalendarStore'

import type {
  Calendar,
  ScheduledItem,
} from '@/features/calendar/types/calendar'

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
const quickAddPopover = ref<InstanceType<typeof Popover> | null>(null)
const quickAddButtonRef = ref<HTMLElement | null>(null)
const quickAddOpen = ref(false)
const isCreatingLayer = ref(false)
const layerError = ref<string | null>(null)
const formInstanceKey = ref(0)

// Keep a local month for the mini calendar so arrow navigation doesn't move the big calendar.
const miniDate = ref(new Date(props.viewDate))
watch(
  () => props.viewDate,
  (d) => {
    miniDate.value = new Date(d)
  }
)

function handleQuickAddToggle(event: Event) {
  if (isCreatingLayer.value) {
    return
  }
  if (quickAddOpen.value) {
    quickAddPopover.value?.hide()
    return
  }
  quickAddOpen.value = true
  if (quickAddButtonRef.value) {
    quickAddPopover.value?.show(event, quickAddButtonRef.value)
  }
}

function handlePopoverHide() {
  quickAddOpen.value = false
  layerError.value = null
  formInstanceKey.value += 1
}

async function handleLayerSubmit(payload: { name: string; color: string }) {
  if (isCreatingLayer.value) return
  layerError.value = null
  isCreatingLayer.value = true
  try {
    await store.createLayerForActiveCalendar({
      name: payload.name,
      color: payload.color,
    })
    quickAddPopover.value?.hide()
    quickAddOpen.value = false
    formInstanceKey.value += 1
  } catch (error) {
    layerError.value =
      error instanceof Error ? error.message : 'Failed to create layer'
  } finally {
    isCreatingLayer.value = false
  }
}

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

    <section class="timeline__tools">
      <MiniCalendar
        :model-value="miniDate"
        @update:model-value="(d) => (miniDate = d)"
        @select="(d) => { emit('update:viewDate', d); emit('jump', d) }"
      />
    </section>

    <section class="timeline__calendars">
      <div class="cal-header">
        <h3>Layers</h3>
        <div class="cal-header__actions">
          <button
            type="button"
            class="cal-add-button"
            :aria-pressed="quickAddOpen"
            :disabled="isCreatingLayer"
            ref="quickAddButtonRef"
            @click="handleQuickAddToggle"
          >
            <span aria-hidden="true">+</span>
            <span class="sr-only">
              {{ quickAddOpen ? 'Hide layer form' : 'Show layer form' }}
            </span>
          </button>

          <Popover
            ref="quickAddPopover"
            :dismissable="!isCreatingLayer"
            :show-close-icon="false"
            :focus-on-show="false"
            @hide="handlePopoverHide"
          >
            <div class="quick-add-popover" role="dialog" aria-label="Quick add layer">
              <LayerQuickAddForm
                :key="formInstanceKey"
                :submitting="isCreatingLayer"
                :error-message="layerError"
                @submit="handleLayerSubmit"
                @cancel="handlePopoverHide"
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
            <span class="day-label">{{ item.title }}</span>
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

