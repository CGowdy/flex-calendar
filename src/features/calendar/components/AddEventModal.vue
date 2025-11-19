<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type {
  Calendar,
  CreateScheduledItemRequest,
} from '@/features/calendar/types/calendar'

const props = defineProps<{
  calendar: Calendar
  open: boolean
  initialDate: string
  busy?: boolean
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'submit', payload: CreateScheduledItemRequest): void
}>()

const form = reactive({
  date: '',
  layerKey: '',
  title: '',
  description: '',
  notes: '',
  durationDays: 1,
})
const formError = reactive({
  message: '',
})

const availableLayers = computed(() =>
  props.calendar.layers.filter((layer) => layer.kind !== 'exception')
)

function resetForm() {
  form.date = props.initialDate ?? new Date().toISOString().slice(0, 10)
  form.layerKey = availableLayers.value[0]?.key ?? ''
  form.title = ''
  form.description = ''
  form.notes = ''
  form.durationDays = 1
  formError.message = ''
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      resetForm()
    }
  },
  { immediate: true }
)

watch(
  () => props.initialDate,
  (next) => {
    if (props.open && next) {
      form.date = next
    }
  }
)

function handleSubmit() {
  if (!form.date || !form.layerKey || form.title.trim().length === 0) {
    formError.message = 'Layer, date, and title are required.'
    return
  }
  const isoDate = new Date(`${form.date}T00:00:00`).toISOString()
  emit('submit', {
    layerKey: form.layerKey,
    date: isoDate,
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    notes: form.notes.trim() || undefined,
    durationDays: form.durationDays || 1,
  })
}
</script>

<template>
  <transition name="fade">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-4 py-8"
      role="dialog"
      aria-modal="true"
    >
      <div class="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <header class="mb-4 flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold text-slate-900 dark:text-white">Add event</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              Choose a layer, pick the day, and describe the event.
            </p>
          </div>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800/70 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="busy"
            @click="emit('close')"
            aria-label="Close add event form"
          >
            ✕
          </button>
        </header>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <label class="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
            <span>Layer</span>
            <select
              v-model="form.layerKey"
              :disabled="busy || availableLayers.length === 0"
              class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option
                v-for="layer in availableLayers"
                :key="layer.key"
                :value="layer.key"
              >
                {{ layer.name }}
              </option>
            </select>
          </label>

          <label class="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
            <span>Date</span>
            <input
              v-model="form.date"
              type="date"
              :disabled="busy"
              class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <label class="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
            <span>Title</span>
            <input
              v-model="form.title"
              type="text"
              placeholder="Event title"
              :disabled="busy"
              class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <label class="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
            <span>Description (optional)</span>
            <textarea
              v-model="form.description"
              rows="2"
              :disabled="busy"
              class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <label class="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
            <span>Notes (optional)</span>
            <textarea
              v-model="form.notes"
              rows="2"
              :disabled="busy"
              class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <label class="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
            <span>Duration (days)</span>
            <input
              v-model.number="form.durationDays"
              type="number"
              min="1"
              :disabled="busy"
              class="w-32 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <p v-if="formError.message" class="text-sm text-red-500">{{ formError.message }}</p>

          <div class="flex justify-end gap-3">
            <button
              type="button"
              class="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/70"
              :disabled="busy"
              @click="emit('close')"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="inline-flex items-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="busy"
            >
              <span v-if="busy">Saving…</span>
              <span v-else>Save event</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>


