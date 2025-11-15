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

interface LayerOption {
  key: string
  name: string
  color: string
  chainBehavior: 'linked' | 'independent'
  kind: 'standard' | 'exception'
  selected: boolean
  description: string
  templateMode: 'generated' | 'manual'
  templateItemCount: number
  titlePattern: string
}

const layerOptions = reactive<LayerOption[]>([
  {
    key: 'reference',
    name: 'Reference Layer',
    color: '#2563eb',
    chainBehavior: 'linked',
    kind: 'standard',
    selected: true,
    description: 'Baseline plan used to define the primary sequence.',
    templateMode: 'generated',
    templateItemCount: 180,
    titlePattern: 'Item {n}',
  },
  {
    key: 'progress-a',
    name: 'Progress Layer',
    color: '#059669',
    chainBehavior: 'linked',
    kind: 'standard',
    selected: true,
    description: 'Layer to track actual progress or a specific participant.',
    templateMode: 'generated',
    templateItemCount: 180,
    titlePattern: 'Progress {n}',
  },
  {
    key: 'progress-b',
    name: 'Additional Layer',
    color: '#7c3aed',
    chainBehavior: 'linked',
    kind: 'standard',
    selected: false,
    description: 'Optional additional progress or scenario layer.',
    templateMode: 'generated',
    templateItemCount: 180,
    titlePattern: '',
  },
  {
    key: 'exceptions',
    name: 'Exceptions',
    color: '#f97316',
    chainBehavior: 'independent',
    kind: 'exception',
    selected: true,
    description: 'Blackout days, pauses, or time off that should not shift.',
    templateMode: 'manual',
    templateItemCount: 0,
    titlePattern: '',
  },
])

const form = reactive({
  name: 'My Flexible Plan',
  startDate: new Date().toISOString().slice(0, 10),
  includeWeekends: false,
  includeExceptions: false,
})

const isValid = computed(
  () =>
    form.name.trim().length > 0 &&
    form.startDate.length > 0 &&
    layerOptions.some((layer) => layer.selected)
)

function handleSubmit() {
  if (!isValid.value || props.submitting) {
    return
  }

  const layers = layerOptions
    .filter((layer) => layer.selected)
    .map((layer) => ({
      key: layer.key,
      name: layer.name,
      color: layer.color,
      chainBehavior: layer.chainBehavior,
      kind: layer.kind,
      description: layer.description,
      templateConfig:
        layer.templateMode === 'generated'
          ? {
              mode: 'generated',
              itemCount: layer.templateItemCount,
              titlePattern: layer.titlePattern?.trim() || undefined,
            }
          : { mode: 'manual' as const },
    }))

  emit('submit', {
    name: form.name.trim(),
    startDate: new Date(form.startDate).toISOString(),
    includeWeekends: form.includeWeekends,
    includeExceptions: form.includeExceptions,
    layers,
  })
}

function toggleLayerChainBehavior(option: LayerOption) {
  option.chainBehavior = option.chainBehavior === 'linked' ? 'independent' : 'linked'
}

function toggleLayerSelection(option: LayerOption) {
  option.selected = !option.selected
}
</script>

<template>
  <div class="fixed inset-0 z-50 grid place-items-center bg-slate-900/70 p-4 sm:p-6" role="dialog" aria-modal="true">
    <div class="flex w-full max-w-4xl max-h-[90vh] flex-col gap-6 overflow-y-auto rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-900">
      <header class="flex items-start justify-between gap-4">
        <div class="space-y-2">
          <h2 class="text-2xl font-semibold text-slate-900 dark:text-white">Create Flexible Calendar</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400">
            Define your start date, scheduling rules, and which layers you want to generate up front.
          </p>
        </div>

        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800/70 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="submitting"
          @click="emit('cancel')"
          aria-label="Close setup wizard"
        >
          ✕
        </button>
      </header>

      <form class="flex flex-col gap-6" @submit.prevent="handleSubmit">
        <section class="space-y-4 rounded-2xl border border-slate-200/80 p-4 dark:border-slate-700/70">
          <label class="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
            <span>Calendar name</span>
            <input
              v-model="form.name"
              type="text"
              required
              placeholder="Roadmap 2025"
              class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <div class="flex flex-col gap-3 sm:flex-row">
            <label class="flex flex-1 flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
              <span>Start date</span>
              <input
                v-model="form.startDate"
                type="date"
                required
                class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
          </div>

          <div class="flex flex-col gap-3">
            <label class="inline-flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
              <input
                v-model="form.includeWeekends"
                type="checkbox"
                class="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand dark:border-slate-600"
              />
              <span>Include weekends as instructional days</span>
            </label>

            <label class="inline-flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
              <input
                v-model="form.includeExceptions"
                type="checkbox"
                class="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand dark:border-slate-600"
              />
              <span>Allow exception layers to shift with the schedule</span>
            </label>
          </div>
        </section>

        <section class="space-y-4">
          <div>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white">Layers</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              Choose the layers you want to generate now. Reference and progress layers default to linked chains, while exceptions stay independent.
            </p>
          </div>

          <ul class="space-y-3">
            <li
              v-for="layer in layerOptions"
              :key="layer.key"
              class="space-y-3 rounded-2xl border border-slate-200 bg-white/95 p-4 dark:border-slate-700 dark:bg-slate-900/70"
            >
              <div class="flex items-center justify-between gap-3">
                <label class="inline-flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    :checked="layer.selected"
                    :disabled="submitting"
                    class="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand dark:border-slate-600"
                    @change="toggleLayerSelection(layer)"
                  />
                  <span>{{ layer.name }}</span>
                </label>
                <span
                  class="h-4 w-4 rounded-full border border-slate-200 dark:border-slate-600"
                  :style="{ backgroundColor: layer.color }"
                  aria-hidden="true"
                />
              </div>

              <p class="text-sm text-slate-500 dark:text-slate-400">
                {{ layer.description }}
              </p>

              <label class="inline-flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  :checked="layer.chainBehavior === 'linked'"
                  :disabled="!layer.selected || submitting"
                  class="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand dark:border-slate-600"
                  @change="toggleLayerChainBehavior(layer)"
                />
                <span>Linked chain (move together)</span>
              </label>

              <label class="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
                <span>Template mode</span>
                <select
                  v-model="layer.templateMode"
                  :disabled="!layer.selected || layer.kind === 'exception' || submitting"
                  class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="generated">Generate sequence</option>
                  <option value="manual">Manual items</option>
                </select>
              </label>

              <div
                v-if="layer.templateMode === 'generated'"
                class="grid gap-3 md:grid-cols-2"
              >
                <label class="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
                  <span>Items to generate</span>
                  <input
                    v-model.number="layer.templateItemCount"
                    type="number"
                    min="1"
                    :disabled="!layer.selected || submitting"
                    class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>

                <label class="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
                  <span>Label pattern (use {n} for the sequence)</span>
                  <input
                    v-model="layer.titlePattern"
                    type="text"
                    :placeholder="'Item {n}'"
                    :disabled="!layer.selected || submitting"
                    class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>
              </div>
            </li>
          </ul>
        </section>

        <footer class="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/70 sm:w-auto"
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
            <span v-if="submitting">Creating…</span>
            <span v-else>Save calendar</span>
          </button>
        </footer>
      </form>
    </div>
  </div>
</template>

