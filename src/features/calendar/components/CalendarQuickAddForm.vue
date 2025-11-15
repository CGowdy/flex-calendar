<script setup lang="ts">
import { computed, reactive } from 'vue'

import type { CreateCalendarRequest } from '@/features/calendar/types/calendar'

const props = defineProps<{
  submitting?: boolean
}>()

const emit = defineEmits<{
  (event: 'submit', payload: CreateCalendarRequest): void
  (event: 'cancel'): void
}>()

const today = new Date()
  .toISOString()
  .slice(0, 10)

const form = reactive({
  name: '',
  startDate: today,
  templateItemCount: 180,
  includeWeekends: false,
  includeExceptions: false,
})

const isValid = computed(
  () =>
    form.name.trim().length > 0 &&
    form.startDate.length > 0 &&
    form.templateItemCount > 0
)

function toISODate(dateString: string): string {
  const [yearPart, monthPart, dayPart] = dateString.split('-')
  const year = Number(yearPart)
  const month = Number(monthPart)
  const day = Number(dayPart)

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return new Date().toISOString()
  }

  return new Date(Date.UTC(year, month - 1, day)).toISOString()
}

function handleSubmit() {
  if (!isValid.value || props.submitting) {
    return
  }

  const baseLayers: CreateCalendarRequest['layers'] = [
    {
      key: 'reference',
      name: 'Reference Layer',
      chainBehavior: 'linked',
      templateConfig: {
        mode: 'generated',
        itemCount: form.templateItemCount,
        titlePattern: 'Item {n}',
      },
    },
    {
      key: 'progress',
      name: 'Progress Layer',
      chainBehavior: 'linked',
      templateConfig: {
        mode: 'generated',
        itemCount: form.templateItemCount,
        titlePattern: 'Progress {n}',
      },
    },
    {
      key: 'exceptions',
      name: 'Exceptions',
      chainBehavior: 'independent',
      kind: 'exception',
      templateConfig: { mode: 'manual' },
    },
  ]

  emit('submit', {
    name: form.name.trim(),
    startDate: toISODate(form.startDate),
    includeWeekends: form.includeWeekends,
    includeExceptions: form.includeExceptions,
    layers: baseLayers,
  })
}
</script>

<template>
  <form
    class="flex w-full flex-col gap-5 rounded-2xl border border-slate-200/80 bg-white/95 p-5 text-slate-900 shadow-elevated dark:border-slate-700/70 dark:bg-slate-900"
    @submit.prevent="handleSubmit"
  >
    <header class="flex items-start justify-between gap-3">
      <div class="space-y-1.5">
        <p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
          Add calendar
        </p>
        <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
          Quick create
        </h2>
        <p class="text-sm text-slate-600 dark:text-slate-300">
          Start a calendar with a reference layer, a progress layer, and an exceptions lane. You can customize layers later as needed.
        </p>
      </div>

      <button
        type="button"
        class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800/70 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="submitting"
        aria-label="Close quick add form"
        @click="emit('cancel')"
      >
        ✕
      </button>
    </header>

    <div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      <label class="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
        <span>Calendar name</span>
        <input
          v-model="form.name"
          type="text"
          placeholder="Content Pipeline 2025"
          :disabled="submitting"
          class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
        />
      </label>

      <label class="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
        <span>Start date</span>
        <input
          v-model="form.startDate"
          type="date"
          :disabled="submitting"
          class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </label>

      <label class="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
        <span>Template items per layer</span>
        <input
          v-model.number="form.templateItemCount"
          type="number"
          min="1"
          :disabled="submitting"
          class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </label>
    </div>

    <div class="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
      <label class="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium dark:border-slate-600">
        <input
          v-model="form.includeWeekends"
          type="checkbox"
          :disabled="submitting"
          class="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand dark:border-slate-600"
        />
        <span>Allow weekends in generated layers</span>
      </label>

      <label class="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium dark:border-slate-600">
        <input
          v-model="form.includeExceptions"
          type="checkbox"
          :disabled="submitting"
          class="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand dark:border-slate-600"
        />
        <span>Let exceptions move with shifts</span>
      </label>
    </div>

    <footer class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button
        type="button"
        class="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto"
        :disabled="submitting"
        @click="emit('cancel')"
      >
        Cancel
      </button>
      <button
        type="submit"
        class="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        :disabled="!isValid || submitting"
      >
        <span v-if="submitting">Saving…</span>
        <span v-else>Save calendar</span>
      </button>
    </footer>
  </form>
</template>

