<script setup lang="ts">
// ADR-Lite
// Context: Calendar creation forced everyone through the setup wizard modal.
// Decision: Default to an inline quick-add form with an optional wizard entry point.
// Consequences: Experienced users create calendars faster while the guided flow remains available.
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import { useCalendarStore } from '@stores/useCalendarStore'
import SetupWizard from './SetupWizard.vue'
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

const CREATE_CALENDAR_OPTION = '__create__'

const showSetupWizard = ref(false)
const showQuickAdd = ref(false)
const showInlineCreate = ref(false)
const inlineCalendarName = ref('')
const inlineCalendarError = ref<string | null>(null)

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
  showInlineCreate.value = false
  showSetupWizard.value = true
}

function closeSetupWizard() {
  if (!isSubmitting.value) {
    showSetupWizard.value = false
  }
}

function openQuickAdd() {
  showSetupWizard.value = false
  showInlineCreate.value = false
  showQuickAdd.value = true
}

function closeQuickAdd() {
  if (!isSubmitting.value) {
    showQuickAdd.value = false
  }
}

async function handleCalendarChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const nextId = target.value
  if (nextId === CREATE_CALENDAR_OPTION) {
    showSetupWizard.value = false
    showQuickAdd.value = false
    inlineCalendarName.value = ''
    inlineCalendarError.value = null
    showInlineCreate.value = true
    target.value = activeCalendarId.value ?? ''
    return
  }

  showInlineCreate.value = false
  inlineCalendarError.value = null
  inlineCalendarName.value = ''

  if (!nextId) {
    calendarStore.selectCalendar(null)
    return
  }
  await calendarStore.loadCalendar(nextId)
}

function cancelInlineCreate() {
  if (isSubmitting.value) {
    return
  }
  showInlineCreate.value = false
  inlineCalendarName.value = ''
  inlineCalendarError.value = null
}

async function handleInlineCreateSubmit() {
  const name = inlineCalendarName.value.trim()
  if (name.length === 0) {
    inlineCalendarError.value = 'Name is required'
    return
  }

  inlineCalendarError.value = null
  isSubmitting.value = true
  try {
    const calendar = await calendarStore.createCalendarAndSelect({
      name,
      layers: [],
    })
    selectedDayId.value = calendar.scheduledItems[0]?.id ?? null
    showInlineCreate.value = false
    showQuickAdd.value = false
  } catch (error) {
    inlineCalendarError.value =
      error instanceof Error ? error.message : 'Failed to create calendar'
  } finally {
    isSubmitting.value = false
  }
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
  <div class="flex w-full flex-col gap-6">
    <section class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">Flex Calendar</h1>
        <p class="text-[var(--color-text)] opacity-75 max-w-2xl mt-1">
          Adjust chainable schedules, track exceptions, and keep every layer in sync.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <select
          v-if="hasCalendars"
          class="min-w-[220px] rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-text)]"
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
          <option :value="CREATE_CALENDAR_OPTION">
            + Create new calendar…
          </option>
        </select>

        <button
          type="button"
          class="inline-flex items-center rounded-xl border border-[var(--color-border)] px-4 py-2 text-[var(--color-text)] transition hover:bg-[rgba(37,99,235,0.08)] disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isBusy"
          @click="openSetupWizard"
        >
          Use Setup Wizard
        </button>
      </div>
    </section>

    <section
      v-if="showInlineCreate"
      class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] p-5"
    >
      <form
        class="flex w-full max-w-md flex-col gap-4"
        @submit.prevent="handleInlineCreateSubmit"
      >
        <label class="flex flex-col gap-2 text-sm font-semibold text-[var(--color-text)]">
          <span>Calendar name</span>
          <input
            v-model="inlineCalendarName"
            type="text"
            :disabled="isSubmitting"
            placeholder="Roadmap 2025"
            aria-label="New calendar name"
            class="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-base text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        <div class="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            class="inline-flex items-center rounded-xl border border-[var(--color-border)] px-4 py-2 text-[var(--color-text)] transition hover:bg-[rgba(37,99,235,0.08)] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isSubmitting"
            @click="cancelInlineCreate"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="inline-flex items-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 px-4 py-2 font-semibold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isSubmitting || inlineCalendarName.trim().length === 0"
          >
            <span v-if="isSubmitting">Creating…</span>
            <span v-else>Create calendar</span>
          </button>
        </div>

        <p
          v-if="inlineCalendarError"
          class="text-sm text-[#b91c1c]"
        >
          {{ inlineCalendarError }}
        </p>
      </form>
    </section>

    <section
      v-if="showQuickAdd && !hasCalendars"
      class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4"
    >
      <CalendarQuickAddForm
        :submitting="isSubmitting"
        @submit="handleQuickAddSubmit"
        @cancel="closeQuickAdd"
      />
    </section>

    <div
      v-if="errorMessage"
      class="rounded-xl border border-red-200/50 bg-red-100/60 px-4 py-3 text-red-700"
      role="alert"
    >
      {{ errorMessage }}
    </div>

    <section
      v-if="selectedCalendar"
      class="grid gap-6 items-start lg:grid-cols-[minmax(260px,320px)_1fr]"
    >
      <CalendarTimeline
        :calendar="selectedCalendar"
        :selected-day-id="selectedDayId"
        :view-date="viewDate"
        @update:viewDate="(d: Date) => viewDate = d"
        @jump="(d: Date) => { viewMode = 'month'; viewDate = d }"
        @select-day="handleSelectDay"
      />

      <div class="flex flex-col gap-3">
        <div class="inline-flex gap-2">
          <button
            type="button"
            class="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1 text-sm text-[var(--color-text)] transition hover:bg-[rgba(37,99,235,0.08)]"
            :class="{ 'border-blue-500 bg-[rgba(37,99,235,0.15)]': viewMode === 'month' }"
            @click="viewMode = 'month'"
          >
            Month
          </button>
          <button
            type="button"
            class="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1 text-sm text-[var(--color-text)] transition hover:bg-[rgba(37,99,235,0.08)]"
            :class="{ 'border-blue-500 bg-[rgba(37,99,235,0.15)]': viewMode === 'week' }"
            @click="viewMode = 'week'"
          >
            Week
          </button>
          <button
            type="button"
            class="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1 text-sm text-[var(--color-text)] transition hover:bg-[rgba(37,99,235,0.08)]"
            :class="{ 'border-blue-500 bg-[rgba(37,99,235,0.15)]': viewMode === 'day' }"
            @click="viewMode = 'day'"
          >
            Day
          </button>
          <button
            type="button"
            class="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1 text-sm text-[var(--color-text)] transition hover:bg-[rgba(37,99,235,0.08)]"
            :class="{ 'border-blue-500 bg-[rgba(37,99,235,0.15)]': viewMode === 'board' }"
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

    <section
      v-else-if="!isLoading"
      class="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-background-soft)] p-12 text-center"
    >
      <p>
        Start by creating your first calendar. Use quick add for defaults or the
        setup wizard if you want the guided experience.
      </p>
      <div class="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          class="inline-flex items-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 px-4 py-2 font-semibold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isBusy"
          @click="openQuickAdd"
        >
          Open Quick Add
        </button>
        <button
          type="button"
          class="inline-flex items-center rounded-xl border border-[var(--color-border)] px-4 py-2 text-[var(--color-text)] transition hover:bg-[rgba(37,99,235,0.08)] disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isBusy"
          @click="openSetupWizard"
        >
          Use Setup Wizard
        </button>
      </div>
    </section>

    <div
      v-if="isBusy"
      class="fixed bottom-6 right-6 flex items-center gap-3 rounded-full bg-[rgba(15,23,42,0.9)] px-4 py-2 text-sm text-white shadow-2xl"
      role="status"
    >
      <span
        class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
        aria-hidden="true"
      />
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

