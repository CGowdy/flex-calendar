<script setup lang="ts">
// ADR-Lite
// Context: Calendar creation forced everyone through the setup wizard modal.
// Decision: Default to an inline quick-add form with an optional wizard entry point.
// Consequences: Experienced users create calendars faster while the guided flow remains available.
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import { useCalendarStore } from '@stores/useCalendarStore'
import SetupWizard from './SetupWizard.vue'
import CalendarQuickAddForm from './CalendarQuickAddForm.vue'
import CalendarTimeline from './CalendarTimeline.vue'
import DraggableCalendarGrid from './DraggableCalendarGrid.vue'
import MonthCalendar from './MonthCalendar.vue'
import WeekCalendar from './WeekCalendar.vue'
import DayCalendar from './DayCalendar.vue'
import type {
  Calendar,
  CreateCalendarRequest,
  ShiftScheduledItemsRequest,
} from '@/features/calendar/types/calendar'

const calendarStore = useCalendarStore()
const {
  calendars,
  activeCalendar,
  activeCalendarId,
  isLoading,
  errorMessage,
  visibleLayerKeys,
} = storeToRefs(calendarStore)

const showSetupWizard = ref(false)
const showQuickAdd = ref(false)
const selectedDayId = ref<string | null>(null)
const isSubmitting = ref(false)
const shiftInProgress = ref(false)

const selectedCalendar = computed<Calendar | null>(() => activeCalendar.value ?? null)
const viewMode = ref<'month' | 'week' | 'day' | 'board'>('month')
const viewDate = ref<Date>(new Date())


const hasCalendars = computed(() => calendars.value.length > 0)
const isBusy = computed(
  () =>
    isLoading.value || isSubmitting.value || shiftInProgress.value
)

onMounted(async () => {
  await calendarStore.loadCalendars()
  if (calendars.value.length > 0) {
    const firstCalendar = calendars.value[0]
    if (firstCalendar) {
      await calendarStore.loadCalendar(firstCalendar.id)
    }
    showQuickAdd.value = false
  } else {
    showQuickAdd.value = true
  }
})

watch(
  calendars,
  (next) => {
    if (next.length === 0) {
      showQuickAdd.value = true
    }
  },
  { immediate: true }
)

watch(
  selectedCalendar,
  (calendar) => {
    if (!calendar) {
      selectedDayId.value = null
      return
    }

    const stillExists = calendar.scheduledItems.some(
      (item) => item.id === selectedDayId.value
    )
    if (!stillExists) {
      selectedDayId.value = calendar.scheduledItems[0]?.id ?? null
    }
  },
  { immediate: true }
)

function openSetupWizard() {
  showQuickAdd.value = false
  showSetupWizard.value = true
}

function closeSetupWizard() {
  if (!isSubmitting.value) {
    showSetupWizard.value = false
  }
}

function openQuickAdd() {
  showSetupWizard.value = false
  showQuickAdd.value = true
}

function closeQuickAdd() {
  if (!isSubmitting.value) {
    showQuickAdd.value = false
  }
}

function toggleQuickAdd() {
  if (isSubmitting.value) {
    return
  }

  if (showQuickAdd.value) {
    closeQuickAdd()
  } else {
    openQuickAdd()
  }
}

async function handleCalendarChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const nextId = target.value
  if (!nextId) {
    calendarStore.selectCalendar(null)
    return
  }
  await calendarStore.loadCalendar(nextId)
}

async function handleSetupSubmit(payload: CreateCalendarRequest) {
  isSubmitting.value = true
  try {
    const calendar = await calendarStore.createCalendarAndSelect(payload)
    showSetupWizard.value = false
    selectedDayId.value = calendar.scheduledItems[0]?.id ?? null
  } finally {
    isSubmitting.value = false
  }
}

async function handleQuickAddSubmit(payload: CreateCalendarRequest) {
  isSubmitting.value = true
  try {
    const calendar = await calendarStore.createCalendarAndSelect(payload)
    showQuickAdd.value = false
    selectedDayId.value = calendar.scheduledItems[0]?.id ?? null
  } finally {
    isSubmitting.value = false
  }
}

function handleSelectDay(scheduledItemId: string) {
  selectedDayId.value = scheduledItemId
}

async function handleShiftCalendar(payload: ShiftScheduledItemsRequest) {
  if (!selectedCalendar.value) {
    return
  }

  shiftInProgress.value = true
  try {
    const updated = await calendarStore.shiftScheduledItem(payload)
    if (updated && selectedDayId.value) {
      const stillExists = updated.scheduledItems.some(
        (item) => item.id === selectedDayId.value
      )
      if (!stillExists) {
        selectedDayId.value = updated.scheduledItems[0]?.id ?? null
      }
    }
  } finally {
    shiftInProgress.value = false
  }
}

</script>

<template>
  <div class="dashboard">
    <section class="dashboard__header">
      <div>
        <h1>Flex Calendar</h1>
        <p class="dashboard__subtitle">
          Adjust chainable schedules, track exceptions, and keep every layer in sync.
        </p>
      </div>
      <div class="dashboard__actions">
        <select
          v-if="hasCalendars"
          class="calendar-select"
          :value="activeCalendarId ?? ''"
          :disabled="isBusy"
          @change="handleCalendarChange"
        >
          <option value="" disabled>Select a calendar</option>
          <option
            v-for="calendar in calendars"
            :key="calendar.id"
            :value="calendar.id"
          >
            {{ calendar.name }}
          </option>
        </select>

        <button
          type="button"
          class="ghost-button"
          :disabled="isBusy"
          @click="openSetupWizard"
        >
          Use Setup Wizard
        </button>
      </div>
    </section>

    <section v-if="showQuickAdd && !hasCalendars" class="quick-add-section">
      <CalendarQuickAddForm
        :submitting="isSubmitting"
        @submit="handleQuickAddSubmit"
        @cancel="closeQuickAdd"
      />
    </section>

    <div
      v-if="errorMessage"
      class="alert"
      role="alert"
    >
      {{ errorMessage }}
    </div>

    <section v-if="selectedCalendar" class="dashboard__content">
      <CalendarTimeline
        :calendar="selectedCalendar"
        :selected-day-id="selectedDayId"
        :view-date="viewDate"
        :quick-add-open="showQuickAdd"
        :quick-add-submitting="isSubmitting"
        @update:viewDate="(d: Date) => viewDate = d"
        @jump="(d: Date) => { viewMode = 'month'; viewDate = d }"
        @select-day="handleSelectDay"
        @toggle-quick-add="toggleQuickAdd"
        @submit-quick-add="handleQuickAddSubmit"
        @cancel-quick-add="closeQuickAdd"
      />

      <div class="content-right">
        <div class="view-toggle">
          <button
            type="button"
            class="toggle"
            :class="{ active: viewMode === 'month' }"
            @click="viewMode = 'month'"
          >
            Month
          </button>
          <button
            type="button"
            class="toggle"
            :class="{ active: viewMode === 'week' }"
            @click="viewMode = 'week'"
          >
            Week
          </button>
          <button
            type="button"
            class="toggle"
            :class="{ active: viewMode === 'day' }"
            @click="viewMode = 'day'"
          >
            Day
          </button>
          <button
            type="button"
            class="toggle"
            :class="{ active: viewMode === 'board' }"
            @click="viewMode = 'board'"
          >
            Board
          </button>
        </div>

        <MonthCalendar
          v-if="viewMode === 'month'"
          :calendar="selectedCalendar"
          :selected-day-id="selectedDayId"
          :view-date="viewDate"
          :visible-layer-keys="visibleLayerKeys"
          @select-day="handleSelectDay"
          @shift-day="handleShiftCalendar"
          @update:viewDate="(d: Date) => viewDate = d"
        />

        <WeekCalendar
          v-else-if="viewMode === 'week'"
          :calendar="selectedCalendar"
          :selected-day-id="selectedDayId"
          :visible-layer-keys="visibleLayerKeys"
          @select-day="handleSelectDay"
        />

        <DayCalendar
          v-else-if="viewMode === 'day'"
          :calendar="selectedCalendar"
          :selected-day-id="selectedDayId"
          @select-day="handleSelectDay"
        />

        <DraggableCalendarGrid
          v-else
          :calendar="selectedCalendar"
          :selected-day-id="selectedDayId"
          :visible-layer-keys="visibleLayerKeys"
          :disabled="isBusy"
          @select-day="handleSelectDay"
          @shift-day="handleShiftCalendar"
        />
      </div>
    </section>

    <section v-else-if="!isLoading" class="empty-state">
      <p>
        Start by creating your first calendar. Use quick add for defaults or the
        setup wizard if you want the guided experience.
      </p>
      <div class="empty-state__actions">
        <button
          type="button"
          class="primary-button"
          :disabled="isBusy"
          @click="openQuickAdd"
        >
          Open Quick Add
        </button>
        <button
          type="button"
          class="ghost-button"
          :disabled="isBusy"
          @click="openSetupWizard"
        >
          Use Setup Wizard
        </button>
      </div>
    </section>

    <div v-if="isBusy" class="loading-indicator" role="status">
      <span class="spinner" aria-hidden="true" />
      <span>Syncing updates…</span>
    </div>

    <SetupWizard
      v-if="showSetupWizard"
      :submitting="isSubmitting"
      @submit="handleSetupSubmit"
      @cancel="closeSetupWizard"
    />

  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
}

.dashboard__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.dashboard__subtitle {
  color: var(--color-text);
  opacity: 0.75;
  max-width: 640px;
  margin-top: 0.25rem;
}

.dashboard__actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.calendar-select {
  min-width: 220px;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
  background: var(--color-background);
}

.ghost-button {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  cursor: pointer;
}

.ghost-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ghost-button:not(:disabled):hover {
  background: rgba(37, 99, 235, 0.08);
}

.primary-button {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  padding: 0.55rem 1.25rem;
  border-radius: 0.75rem;
  border: none;
  cursor: pointer;
  font-weight: 600;
  box-shadow: 0 12px 24px -12px rgba(37, 99, 235, 0.6);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  box-shadow: none;
}

.primary-button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 28px -14px rgba(37, 99, 235, 0.6);
}

.alert {
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(220, 38, 38, 0.2);
  background: rgba(254, 226, 226, 0.65);
  color: #b91c1c;
}

.dashboard__content {
  display: grid;
  grid-template-columns: minmax(260px, 320px) 1fr;
  gap: 1.5rem;
  align-items: start;
}

.content-right {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.view-toggle {
  display: inline-flex;
  gap: 0.25rem;
}

.toggle {
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  padding: 0.35rem 0.6rem;
  border-radius: 0.5rem;
  cursor: pointer;
}

.toggle.active {
  border-color: rgba(37, 99, 235, 0.5);
  background: rgba(37, 99, 235, 0.15);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  border: 1px dashed var(--color-border);
  border-radius: 1rem;
  background: var(--color-background-soft);
  text-align: center;
}

.empty-state__actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
}

.quick-add-section {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.loading-indicator {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  background: rgba(15, 23, 42, 0.9);
  color: #fff;
  padding: 0.75rem 1rem;
  border-radius: 9999px;
  display: flex;
  gap: 0.75rem;
  align-items: center;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.4);
}

.spinner {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1024px) {
  .dashboard__content {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
    .dashboard__header {
      flex-direction: column;
      align-items: flex-start;
    }

    .dashboard__actions {
      width: 100%;
      justify-content: flex-start;
    }

    .calendar-select {
      flex: 1;
    }
}
</style>

