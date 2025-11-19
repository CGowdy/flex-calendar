<script setup lang="ts">
// ADR-Lite
// Context: Calendar creation forced everyone through the setup wizard modal.
// Decision: Default to an inline quick-add form with an optional wizard entry point.
// Consequences: Experienced users create calendars faster while the guided flow remains available.
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import { useCalendarStore } from '@stores/useCalendarStore'
import SetupWizard from './SetupWizard.vue'
import CalendarTimeline from './CalendarTimeline.vue'
import DraggableCalendarGrid from './DraggableCalendarGrid.vue'
import MonthCalendar from './MonthCalendar.vue'
import WeekCalendar from './WeekCalendar.vue'
import DayCalendar from './DayCalendar.vue'
import ExceptionsManager from './ExceptionsManager.vue'
import DayDetailDrawer from './DayDetailDrawer.vue'
import AddEventModal from './AddEventModal.vue'
import CalendarQuickAddForm from './CalendarQuickAddForm.vue'
import PrintView from './PrintView.vue'
import type {
  Calendar,
  CreateCalendarRequest,
  CreateScheduledItemRequest,
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
  linkedLayerKeys,
} = storeToRefs(calendarStore)

const CREATE_CALENDAR_OPTION = '__create__'

const showSetupWizard = ref(false)
const showQuickAdd = ref(false)
const showInlineCreate = ref(false)
const showExceptionsManager = ref(false)
const showDayDrawer = ref(false)
const showAddEventModal = ref(false)
const inlineCalendarName = ref('')
const inlineCalendarError = ref<string | null>(null)

const selectedDayId = ref<string | null>(null)
const isSubmitting = ref(false)
const shiftInProgress = ref(false)
const isSavingEvent = ref(false)

const selectedCalendar = computed<Calendar | null>(() => activeCalendar.value ?? null)
const selectedDay = computed(() =>
  selectedCalendar.value?.scheduledItems.find((item) => item.id === selectedDayId.value) ?? null
)
const viewMode = ref<'month' | 'week' | 'day' | 'board'>('month')
const viewDate = ref<Date>(new Date())
const ghostStyle = ref<'connected' | 'dashed'>('connected')

if (typeof window !== 'undefined') {
  const savedGhostStyle = window.localStorage.getItem('flexCalendar:ghostStyle')
  if (savedGhostStyle === 'connected' || savedGhostStyle === 'dashed') {
    ghostStyle.value = savedGhostStyle
  }
  watch(
    ghostStyle,
    (style) => {
      window.localStorage.setItem('flexCalendar:ghostStyle', style)
    },
    { immediate: false }
  )
}


const hasCalendars = computed(() => calendars.value.length > 0)
const isBusy = computed(
  () =>
    isLoading.value || isSubmitting.value || shiftInProgress.value
)

const addEventDefaults = reactive({
  date: new Date().toISOString().slice(0, 10),
})

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
      showDayDrawer.value = false
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
    showDayDrawer.value = false
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
    showDayDrawer.value = false
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
    showDayDrawer.value = false
  } finally {
    isSubmitting.value = false
  }
}

function handleSelectDay(scheduledItemId: string) {
  selectedDayId.value = scheduledItemId
  showDayDrawer.value = true
  const match = selectedCalendar.value?.scheduledItems.find(
    (item) => item.id === scheduledItemId
  )
  if (match) {
    viewDate.value = new Date(match.date)
  }
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

function openExceptionsManager() {
  if (!selectedCalendar.value) {
    return
  }
  showExceptionsManager.value = true
}

async function handleSplitEvent(payload: { scheduledItemId: string; parts: number }) {
  if (!payload.scheduledItemId || payload.parts < 2) {
    return
  }
  try {
    await calendarStore.splitScheduledItem({
      scheduledItemId: payload.scheduledItemId,
      parts: payload.parts,
    })
  } catch (error) {
    console.error(error)
  }
}

function handleRequestAddEvent(dateIso?: string) {
  if (!selectedCalendar.value) return
  const targetDate =
    dateIso ??
    (viewDate.value
      ? viewDate.value.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10))
  addEventDefaults.date = targetDate
  showAddEventModal.value = true
}

async function handleCreateScheduledItem(payload: CreateScheduledItemRequest) {
  if (!selectedCalendar.value) {
    return
  }
  isSavingEvent.value = true
  try {
    await calendarStore.addScheduledItem(payload)
    showAddEventModal.value = false
  } finally {
    isSavingEvent.value = false
  }
}

function handleUnsplitEvent(payload: { scheduledItemId?: string; splitGroupId?: string }) {
  calendarStore.unsplitScheduledItem(payload).catch((error) => {
    console.error(error)
  })
}

function handlePrintView() {
  window.print()
}

function closeAddEventModal() {
  if (isSavingEvent.value) {
    return
  }
  showAddEventModal.value = false
}

</script>

<template>
  <div class="flex w-full flex-col gap-6 print:hidden">
    <section class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900 dark:text-white">Flex Calendar</h1>
        <p class="mt-1 max-w-2xl text-base text-slate-600 dark:text-slate-300">
          Adjust chainable schedules, track exceptions, and keep every layer in sync.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <select
          v-if="hasCalendars"
          class="min-w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
          class="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/70"
          :disabled="isBusy"
          @click="openSetupWizard"
        >
          Use Setup Wizard
        </button>
      </div>
    </section>

    <section
      v-if="showInlineCreate"
      class="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-700/70 dark:bg-slate-900"
    >
      <form
        class="flex w-full max-w-md flex-col gap-4"
        @submit.prevent="handleInlineCreateSubmit"
      >
        <label class="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
          <span>Calendar name</span>
          <input
            v-model="inlineCalendarName"
            type="text"
            :disabled="isSubmitting"
            placeholder="Roadmap 2025"
            aria-label="New calendar name"
            class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>

        <div class="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            class="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/70"
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
      class="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900"
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
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="inline-flex gap-2">
            <button
              type="button"
              class="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/70"
              :class="{ 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/20 dark:text-blue-100': viewMode === 'month' }"
              @click="viewMode = 'month'"
            >
              Month
            </button>
            <button
              type="button"
              class="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/70"
              :class="{ 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/20 dark:text-blue-100': viewMode === 'week' }"
              @click="viewMode = 'week'"
            >
              Week
            </button>
            <button
              type="button"
              class="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/70"
              :class="{ 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/20 dark:text-blue-100': viewMode === 'day' }"
              @click="viewMode = 'day'"
            >
              Day
            </button>
            <button
              type="button"
              class="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/70"
              :class="{ 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/20 dark:text-blue-100': viewMode === 'board' }"
              @click="viewMode = 'board'"
            >
              Board
            </button>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/70"
              :disabled="isBusy || !selectedCalendar"
              @click="handleRequestAddEvent()"
            >
              Add Event
            </button>
            <button
              type="button"
              class="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/70"
              :disabled="isBusy"
              @click="openExceptionsManager"
            >
              Manage Exceptions
            </button>
            <button
              type="button"
              class="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/70"
              :disabled="isBusy || !selectedCalendar"
              @click="handlePrintView"
            >
              Print View
            </button>
          </div>
        <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>Ghost style:</span>
          <div class="inline-flex rounded-full border border-slate-200 bg-white p-1 text-sm dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              class="rounded-full px-3 py-1"
              :class="ghostStyle === 'connected' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-600 dark:text-slate-300'"
              @click="ghostStyle = 'connected'"
            >
              Connected
            </button>
            <button
              type="button"
              class="rounded-full px-3 py-1"
              :class="ghostStyle === 'dashed' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-600 dark:text-slate-300'"
              @click="ghostStyle = 'dashed'"
            >
              Dashed
            </button>
          </div>
        </div>
        </div>

        <MonthCalendar
          v-if="viewMode === 'month'"
          :calendar="selectedCalendar"
          :selected-day-id="selectedDayId"
          :view-date="viewDate"
          :visible-layer-keys="visibleLayerKeys"
          :ghost-style="ghostStyle"
          @select-day="handleSelectDay"
          @shift-day="handleShiftCalendar"
          @update:viewDate="(d: Date) => viewDate = d"
          @add-event="(detail) => handleRequestAddEvent(detail.date)"
        />

        <WeekCalendar
          v-else-if="viewMode === 'week'"
          :calendar="selectedCalendar"
          :selected-day-id="selectedDayId"
          :visible-layer-keys="visibleLayerKeys"
          :view-date="viewDate"
           :ghost-style="ghostStyle"
          @select-day="handleSelectDay"
          @update:viewDate="(d: Date) => viewDate = d"
          @add-event="(detail) => handleRequestAddEvent(detail.date)"
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
      class="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-12 text-center text-slate-600 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-300"
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
          class="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/70"
          :disabled="isBusy"
          @click="openSetupWizard"
        >
          Use Setup Wizard
        </button>
      </div>
    </section>

    <div
      v-if="isBusy"
      class="fixed bottom-6 right-6 flex items-center gap-3 rounded-full bg-slate-900/90 px-4 py-2 text-sm text-white shadow-2xl"
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

    <ExceptionsManager
      v-if="selectedCalendar"
      :calendar="selectedCalendar"
      :open="showExceptionsManager"
      @close="showExceptionsManager = false"
    />

    <DayDetailDrawer
      :open="showDayDrawer && Boolean(selectedDay && selectedCalendar)"
      :calendar="selectedCalendar"
      :day="selectedDay"
      :linked-layer-keys="linkedLayerKeys"
      :busy="isBusy || shiftInProgress"
      @close="showDayDrawer = false"
      @shift="handleShiftCalendar"
      @split="handleSplitEvent"
      @unsplit="handleUnsplitEvent"
    />
    <AddEventModal
      v-if="selectedCalendar"
      :calendar="selectedCalendar"
      :open="showAddEventModal"
      :initial-date="addEventDefaults.date"
      :busy="isSavingEvent"
      @close="closeAddEventModal"
      @submit="handleCreateScheduledItem"
    />
  </div>
  <PrintView
    class="hidden print:block"
    :calendar="selectedCalendar"
    :view-mode="viewMode"
    :view-date="viewDate"
    :visible-layer-keys="visibleLayerKeys"
  />
</template>

