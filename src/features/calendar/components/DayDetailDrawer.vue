<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

import type {
  Calendar,
  ScheduledItem,
  ShiftScheduledItemsRequest,
} from '@/features/calendar/types/calendar'

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
})

const layerOptions = computed(() => props.calendar?.layers ?? [])

watch(
  () => props.day,
  (day) => {
    if (!day) {
      state.layerSelections = []
      state.splitParts = 2
      return
    }
    const defaults = new Set(props.linkedLayerKeys)
    defaults.add(day.layerKey)
    state.layerSelections = Array.from(defaults)
    state.shiftByDays = 1
    state.splitParts = 2
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
    scheduledItemId: props.day.id,
    shiftByDays: sign,
    layerKeys: state.layerSelections,
  })
}

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
            {{ formatDate(day!.date) }} · Layer:
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
        <article class="space-y-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
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
        </article>

        <article class="space-y-5 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
          <header class="space-y-1">
            <h3 class="text-base font-semibold text-slate-900 dark:text-white">Reschedule items</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              Select the layers that should adjust with this change.
            </p>
          </header>

          <div class="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              class="flex-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-400/60 dark:bg-blue-500/10 dark:text-blue-100"
              :disabled="busy"
              @click="handleShift(-1)"
            >
              Move up 1 day
            </button>
            <button
              type="button"
              class="flex-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-400/60 dark:bg-blue-500/10 dark:text-blue-100"
              :disabled="busy"
              @click="handleShift(1)"
            >
              Delay 1 day
            </button>
          </div>

          <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
            <label class="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
              <span>Shift by (days)</span>
              <input
                v-model.number="state.shiftByDays"
                type="number"
                min="-30"
                max="30"
                :disabled="busy"
                class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <fieldset class="space-y-3 rounded-xl border border-slate-200/80 p-3 dark:border-slate-700/70">
              <legend class="px-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Layer adjustments</legend>
              <ul class="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li
                  v-for="layer in layerOptions"
                  :key="layer.key"
                >
                  <label class="inline-flex items-center gap-3">
                    <input
                      type="checkbox"
                      :value="layer.key"
                      v-model="state.layerSelections"
                      :disabled="busy"
                      class="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand dark:border-slate-600"
                    />
                    <span>{{ layer.name }}</span>
                  </label>
                </li>
              </ul>
            </fieldset>

            <button
              type="submit"
              class="ml-auto inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="busy || state.shiftByDays === 0"
            >
              <span v-if="busy">Updating…</span>
              <span v-else>Apply shift</span>
            </button>
          </form>
        </article>

        <article class="space-y-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
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
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-xl border border-transparent bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="busy"
              @click="handleUnsplit"
            >
              Merge split parts
            </button>
          </div>
          <form
            v-else
            class="flex flex-col gap-3 text-sm text-slate-600 dark:text-slate-300"
            @submit.prevent="handleSplit"
          >
            <label class="flex items-center gap-3">
              <span class="w-32 text-slate-500 dark:text-slate-400">Number of parts</span>
              <input
                v-model.number="state.splitParts"
                type="number"
                min="2"
                max="6"
                :disabled="busy"
                class="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
            <button
              type="submit"
              class="ml-auto inline-flex items-center justify-center rounded-xl border border-transparent bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="busy || state.splitParts < 2"
            >
              Split into {{ state.splitParts }} parts
            </button>
          </form>
        </article>
      </section>
    </aside>
  </Transition>
</template>

