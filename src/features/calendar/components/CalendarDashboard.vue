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
import ErrorMessage from './ui/ErrorMessage.vue'
import CalendarSelector from './ui/CalendarSelector.vue'
import ViewModeSelector from './ui/ViewModeSelector.vue'
import Button from './ui/Button.vue'
import FormInput from './ui/FormInput.vue'
import Card from './ui/Card.vue'
import EmptyState from './ui/EmptyState.vue'
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

function handleCalendarCreate() {
  showSetupWizard.value = false
  showQuickAdd.value = false
  inlineCalendarName.value = ''
  inlineCalendarError.value = null
  showInlineCreate.value = true
}

async function handleCalendarSelect(nextId: string | null) {
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
        <CalendarSelector
          v-if="hasCalendars"
          :calendars="calendars"
          :selected-id="activeCalendarId"
          :disabled="isBusy"
          @update:selected-id="(id) => handleCalendarSelect(id)"
          @create="handleCalendarCreate"
        />

        <Button variant="secondary" :disabled="isBusy" @click="openSetupWizard">
          Use Setup Wizard
        </Button>
      </div>
    </section>

    <Card
      v-if="showInlineCreate"
      padding="lg"
    >
      <form
        class="flex w-full max-w-md flex-col gap-4"
        @submit.prevent="handleInlineCreateSubmit"
      >
        <FormInput
          v-model="inlineCalendarName"
          type="text"
          label="Calendar name"
          placeholder="Roadmap 2025"
          :disabled="isSubmitting"
          required
          :error="inlineCalendarError"
        />

        <div class="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" :disabled="isSubmitting" @click="cancelInlineCreate">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            :disabled="isSubmitting || inlineCalendarName.trim().length === 0"
          >
            <span v-if="isSubmitting">Creating…</span>
            <span v-else>Create calendar</span>
          </Button>
        </div>
      </form>
    </Card>

    <Card
      v-if="showQuickAdd && !hasCalendars"
      padding="md"
    >
      <CalendarQuickAddForm
        :submitting="isSubmitting"
        @submit="handleQuickAddSubmit"
        @cancel="closeQuickAdd"
      />
    </Card>

    <ErrorMessage v-if="errorMessage" :message="errorMessage" />

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
          <ViewModeSelector v-model="viewMode" />
          <div class="flex flex-wrap gap-2">
            <Button variant="secondary" :disabled="isBusy || !selectedCalendar" @click="handleRequestAddEvent()">
              Add Event
            </Button>
            <Button variant="secondary" :disabled="isBusy" @click="openExceptionsManager">
              Manage Exceptions
            </Button>
            <Button variant="secondary" :disabled="isBusy || !selectedCalendar" @click="handlePrintView">
              Print View
            </Button>
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

    <EmptyState
      v-else-if="!isLoading"
      description="Start by creating your first calendar. Use quick add for defaults or the setup wizard if you want the guided experience."
    >
      <template #action>
        <div class="flex flex-wrap justify-center gap-3">
          <Button variant="primary" :disabled="isBusy" @click="openQuickAdd">
            Open Quick Add
          </Button>
          <Button variant="secondary" :disabled="isBusy" @click="openSetupWizard">
            Use Setup Wizard
          </Button>
        </div>
      </template>
    </EmptyState>

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

