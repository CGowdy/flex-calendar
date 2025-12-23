<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

import type {
  Calendar,
  ScheduledItem,
  ShiftScheduledItemsRequest,
} from '@/features/calendar/types/calendar'
import Card from './ui/Card.vue'
import Button from './ui/Button.vue'
import FormInput from './ui/FormInput.vue'
import { dayKey, parseIsoDate, daysBetween } from '@/features/calendar/composables/useDateUtils'

const props = defineProps<{
  open: boolean
  calendar: Calendar | null
  day: ScheduledItem | null
  linkedLayerKeys: string[]
  busy?: boolean
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'shift', payload: ShiftScheduledItemsRequest): void
  (event: 'split', payload: { scheduledItemId: string; parts: number }): void
  (event: 'unsplit', payload: { scheduledItemId?: string; splitGroupId?: string }): void
}>()

const state = reactive({
  shiftByDays: 1,
  layerSelections: [] as string[],
  splitParts: 2,
  targetDate: '', // ISO date string (YYYY-MM-DD) for date picker
  isSyncingDate: false, // Flag to prevent shift when syncing from props
})

const layerOptions = computed(() => props.calendar?.layers ?? [])

watch(
  () => props.day,
  (day) => {
    if (!day) {
      state.layerSelections = []
      state.splitParts = 2
      state.targetDate = ''
      return
    }
    // Only shift within the same layer
    state.layerSelections = [day.layerKey]
    state.shiftByDays = 1
    state.splitParts = 2
    // Sync date picker without triggering shift
    state.isSyncingDate = true
    state.targetDate = dayKey(day.date)
    // Reset flag after a tick to allow user changes
    setTimeout(() => {
      state.isSyncingDate = false
    }, 0)
  },
  { immediate: true }
)

import { formatDate } from '@/features/calendar/composables/useDateUtils'

function formatDateDisplay(iso: string | undefined): string {
  if (!iso) return '—'
  return formatDate(iso, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function handleDateChange(newDate: string) {
  // Don't update shiftByDays when syncing from props
  if (state.isSyncingDate || !props.day || !newDate) return
  
  const targetDate = parseIsoDate(newDate)
  
  // Calculate the difference in days
  const diff = daysBetween(props.day.date, targetDate)
  
  // Update shiftByDays to reflect the change (but don't apply yet - user must click "Apply shift")
  state.shiftByDays = diff
}

// Calculate preview shift when targetDate changes
const calculatedShift = computed(() => {
  if (!props.day || !state.targetDate) return 0
  const currentDateIso = dayKey(props.day.date)
  // If the target date matches current date, no shift
  if (state.targetDate === currentDateIso) return 0
  const targetDate = parseIsoDate(state.targetDate)
  return daysBetween(props.day.date, targetDate)
})


function handleSubmit() {
  if (!props.day || state.shiftByDays === 0 || props.busy) return
  emit('shift', {
    scheduledItemId: props.day.id,
    shiftByDays: state.shiftByDays,
    layerKeys: state.layerSelections,
  })
}

function handleSplit() {
  if (!props.day || props.busy) return
  if (state.splitParts < 2) {
    state.splitParts = 2
  }
  emit('split', {
    scheduledItemId: props.day.id,
    parts: state.splitParts,
  })
}

function handleUnsplit() {
  if (!props.day || props.busy || !props.day.splitGroupId) {
    return
  }
  emit('unsplit', {
    scheduledItemId: props.day.id,
    splitGroupId: props.day.splitGroupId,
  })
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="translate-x-6 opacity-0"
    enter-to-class="translate-x-0 opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="translate-x-0 opacity-100"
    leave-to-class="translate-x-6 opacity-0"
  >
    <aside
      v-if="open && day"
      class="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col gap-6 border-l border-slate-200 bg-white p-6 shadow-[0_15px_45px_-25px_rgba(15,23,42,0.65)] dark:border-slate-700 dark:bg-slate-900"
      role="dialog"
      aria-modal="true"
    >
      <header class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold text-slate-900 dark:text-white">{{ day!.title }}</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400">
            {{ formatDateDisplay(day!.date) }} · Layer:
            <span class="font-medium text-slate-700 dark:text-slate-200">
              {{ calendar?.layers.find((layer) => layer.key === day!.layerKey)?.name ?? day!.layerKey }}
            </span>
          </p>
        </div>
        <button
          type="button"
          class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800/70 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="busy"
          @click="emit('close')"
          aria-label="Close day details"
        >
          ✕
        </button>
      </header>

      <section class="flex-1 space-y-6 overflow-y-auto pr-1">
        <Card padding="md" class="space-y-3">
          <div>
            <h3 class="text-base font-semibold text-slate-900 dark:text-white">Event details</h3>
          <div class="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Title</p>
              <strong class="text-base text-slate-900 dark:text-white">{{ day!.title }}</strong>
            </div>
            <p v-if="day!.description">{{ day!.description }}</p>
            <p v-else class="text-slate-500 dark:text-slate-400">No description provided.</p>
            <p v-if="day!.notes" class="text-slate-500 dark:text-slate-400">
              Notes: {{ day!.notes }}
            </p>
          </div>
            <span class="text-xs font-semibold uppercase tracking-[0.25em] text-blue-600 dark:text-blue-300">
              Duration: {{ day!.durationDays ?? 1 }} day{{ (day!.durationDays ?? 1) === 1 ? '' : 's' }}
            </span>
          </div>
        </Card>

        <Card padding="md" class="space-y-5">
          <header class="space-y-1">
            <h3 class="text-base font-semibold text-slate-900 dark:text-white">Reschedule item</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              Move this item to a different date. Other items in this layer will automatically shift to maintain the sequence.
            </p>
            <p v-if="calendar?.includeExceptions" class="text-xs text-slate-500 dark:text-slate-400">
              Exception dates will be skipped when calculating the new position.
            </p>
          </header>

          <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
            <FormInput
              v-model="state.targetDate"
              type="date"
              label="Move to date"
              :disabled="busy"
              @update:modelValue="handleDateChange"
            />
            <p v-if="calculatedShift !== 0 && state.targetDate" class="text-xs text-slate-500 dark:text-slate-400">
              <span v-if="calculatedShift > 0">Will move forward by {{ calculatedShift }} day{{ calculatedShift === 1 ? '' : 's' }}</span>
              <span v-else>Will move back by {{ Math.abs(calculatedShift) }} day{{ Math.abs(calculatedShift) === 1 ? '' : 's' }}</span>
            </p>
            
            <FormInput
              v-model.number="state.shiftByDays"
              type="number"
              label="Or shift by (days)"
              :min="-30"
              :max="30"
              :disabled="busy"
            />
            <p v-if="state.shiftByDays !== 0" class="text-xs text-slate-500 dark:text-slate-400">
              <span v-if="state.shiftByDays > 0">Will move forward by {{ state.shiftByDays }} day{{ state.shiftByDays === 1 ? '' : 's' }}</span>
              <span v-else>Will move back by {{ Math.abs(state.shiftByDays) }} day{{ Math.abs(state.shiftByDays) === 1 ? '' : 's' }}</span>
            </p>

            <Button
              type="submit"
              variant="primary"
              class="ml-auto"
              :disabled="busy || state.shiftByDays === 0"
            >
              <span v-if="busy">Updating…</span>
              <span v-else>Apply shift</span>
            </Button>
          </form>
        </Card>

        <Card padding="md" class="space-y-4">
          <header class="space-y-1">
            <h3 class="text-base font-semibold text-slate-900 dark:text-white">Split event</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              Break this event into consecutive parts. Each part becomes its own item and pushes the
              rest of the layer forward.
            </p>
          </header>

          <div
            v-if="day?.splitTotal && (day?.splitTotal ?? 1) > 1"
            class="space-y-3 rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-300"
          >
            <p>
              This event is already split (Part {{ day?.splitIndex }} of {{ day?.splitTotal }}).
            </p>
            <Button
              variant="primary"
              class="bg-emerald-600 hover:bg-emerald-500"
              :disabled="busy"
              @click="handleUnsplit"
            >
              Merge split parts
            </Button>
          </div>
          <form
            v-else
            class="flex flex-col gap-3 text-sm text-slate-600 dark:text-slate-300"
            @submit.prevent="handleSplit"
          >
            <FormInput
              v-model.number="state.splitParts"
              type="number"
              label="Number of parts"
              :min="2"
              :max="6"
              :disabled="busy"
            />
            <Button
              type="submit"
              variant="primary"
              class="ml-auto bg-violet-600 hover:bg-violet-500"
              :disabled="busy || state.splitParts < 2"
            >
              Split into {{ state.splitParts }} parts
            </Button>
          </form>
        </Card>
      </section>
    </aside>
  </Transition>
</template>

