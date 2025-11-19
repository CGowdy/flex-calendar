<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { useCalendarStore } from '@stores/useCalendarStore'
import type { Calendar } from '@/features/calendar/types/calendar'
import type { UpdateExceptionsRequest } from '@/features/calendar/types/calendar'

const props = defineProps<{
  calendar: Calendar
  open: boolean
}>()

const emit = defineEmits<{
  (event: 'close'): void
}>()

const calendarStore = useCalendarStore()

const dateInput = ref('')
const titleInput = ref('')
const scope = ref<'global' | 'custom'>('global')
const selectedLayerKey = ref<string>('')
const targetedLayers = ref<string[]>([])
const formError = ref<string | null>(null)
const submitting = ref(false)

const exceptionLayers = computed(() =>
  props.calendar.layers.filter((layer) => layer.kind === 'exception')
)

const standardLayers = computed(() =>
  props.calendar.layers.filter((layer) => layer.kind !== 'exception')
)

const exceptionEntries = computed(() =>
  props.calendar.scheduledItems
    .filter((item) => exceptionLayers.value.some((layer) => layer.key === item.layerKey))
    .map((item) => ({
      id: item.id,
      layerKey: item.layerKey,
      date: item.date,
      title: item.title,
      targetLayerKeys: item.targetLayerKeys ?? [],
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
)

function ensureSelectedLayer() {
  if (!selectedLayerKey.value && exceptionLayers.value.length > 0) {
    selectedLayerKey.value = exceptionLayers.value[0]!.key
  }
}

function resetForm() {
  dateInput.value = ''
  titleInput.value = ''
  scope.value = 'global'
  targetedLayers.value = []
  formError.value = null
  ensureSelectedLayer()
}

watch(
  () => exceptionLayers.value.map((layer) => layer.key),
  () => ensureSelectedLayer(),
  { immediate: true }
)

async function handleSubmit() {
  if (!props.calendar) return
  if (!dateInput.value) {
    formError.value = 'Select a date to block.'
    return
  }
  if (!selectedLayerKey.value) {
    formError.value = 'Select an exception layer.'
    return
  }

  const payload: UpdateExceptionsRequest = {
    layerKey: selectedLayerKey.value,
    addEntries: [
      {
        date: dateInput.value,
        title: titleInput.value.trim() || undefined,
        targetLayerKeys: scope.value === 'custom' ? [...targetedLayers.value] : undefined,
      },
    ],
  }

  submitting.value = true
  formError.value = null
  try {
    await calendarStore.updateExceptions(payload)
    resetForm()
  } catch (error) {
    formError.value =
      error instanceof Error ? error.message : 'Failed to add exception date.'
  } finally {
    submitting.value = false
  }
}

async function handleRemove(entryId: string, layerKey: string) {
  if (!entryId) return
  submitting.value = true
  formError.value = null
  try {
    await calendarStore.updateExceptions({
      layerKey,
      removeEntryIds: [entryId],
    })
  } catch (error) {
    formError.value =
      error instanceof Error ? error.message : 'Failed to remove exception.'
  } finally {
    submitting.value = false
  }
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
      <div class="relative flex w-full max-w-4xl flex-col gap-6 rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <header class="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Manage Exceptions</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              Add blackout days that all or specific layers should skip. Entries are stored inside
              the selected exception layer.
            </p>
          </div>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800/70"
            :disabled="submitting"
            @click="emit('close')"
            aria-label="Close exception manager"
          >
            ✕
          </button>
        </header>

        <section
          v-if="exceptionLayers.length === 0"
          class="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
        >
          <p class="font-medium">No exception layers available.</p>
          <p class="mt-2">
            Add a layer with kind <strong>exception</strong> in the setup wizard or calendar
            settings to start tracking blocked dates.
          </p>
        </section>

        <div v-else class="grid gap-6 md:grid-cols-[minmax(320px,360px)_1fr]">
          <section class="rounded-2xl border border-slate-200/80 bg-white/95 p-5 dark:border-slate-700/70 dark:bg-slate-900">
            <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
              <label class="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
                <span>Exception layer</span>
                <select
                  v-model="selectedLayerKey"
                  class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  :disabled="submitting"
                >
                  <option
                    v-for="layer in exceptionLayers"
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
                  v-model="dateInput"
                  type="date"
                  class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  :max="new Date().getFullYear() + 5 + '-12-31'"
                  :disabled="submitting"
                  required
                />
              </label>

              <label class="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
                <span>Label (optional)</span>
                <input
                  v-model="titleInput"
                  type="text"
                  placeholder="E.g., Winter Break"
                  class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  :disabled="submitting"
                />
              </label>

              <fieldset class="space-y-2 rounded-xl border border-slate-200/80 p-3 dark:border-slate-700/70">
                <legend class="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Applies to
                </legend>
                <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <input
                    type="radio"
                    value="global"
                    v-model="scope"
                    :disabled="submitting"
                  />
                  <span>All layers that respect global exceptions</span>
                </label>
                <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <input
                    type="radio"
                    value="custom"
                    v-model="scope"
                    :disabled="submitting"
                  />
                  <span>Specific layers only</span>
                </label>

                <div v-if="scope === 'custom'">
                  <label class="sr-only" for="target-layers">Target layers</label>
                  <select
                    id="target-layers"
                    v-model="targetedLayers"
                    multiple
                    class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    :disabled="submitting"
                  >
                    <option
                      v-for="layer in standardLayers"
                      :key="layer.key"
                      :value="layer.key"
                    >
                      {{ layer.name }}
                    </option>
                  </select>
                  <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Leave empty to apply to no layers (not recommended).
                  </p>
                </div>
              </fieldset>

              <p v-if="formError" class="text-sm text-red-600 dark:text-red-400">
                {{ formError }}
              </p>

              <button
                type="submit"
                class="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 px-4 py-2 font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="submitting"
              >
                <span v-if="submitting">Saving…</span>
                <span v-else>Add exception date</span>
              </button>
            </form>
          </section>

          <section class="rounded-2xl border border-slate-200/80 bg-white/95 p-5 dark:border-slate-700/70 dark:bg-slate-900">
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
              Existing exceptions
            </h3>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              Entries marked “Global” affect every layer that respects exceptions. Scoped entries
              list the layers they target.
            </p>

            <div v-if="exceptionEntries.length === 0" class="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No exception dates yet. Add one using the form on the left.
            </div>

            <ul v-else class="mt-4 space-y-3 max-h-[360px] overflow-y-auto pr-2">
              <li
                v-for="entry in exceptionEntries"
                :key="entry.id"
                class="flex items-start justify-between rounded-xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm dark:border-slate-700/70 dark:bg-slate-800"
              >
                <div>
                  <p class="font-semibold text-slate-800 dark:text-slate-100">
                    {{ new Date(entry.date).toLocaleDateString(undefined, { dateStyle: 'medium' }) }}
                  </p>
                  <p class="text-slate-600 dark:text-slate-300">
                    {{ entry.title || 'Exception' }}
                  </p>
                  <p class="text-xs text-slate-500 dark:text-slate-400">
                    Applies to:
                    <span v-if="entry.targetLayerKeys.length === 0">All (respecting) layers</span>
                    <span v-else>
                      {{
                        entry.targetLayerKeys
                          .map((key) => {
                            const layer = props.calendar.layers.find((l) => l.key === key)
                            return layer ? layer.name : key
                          })
                          .join(', ')
                      }}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  class="inline-flex items-center rounded-lg border border-transparent px-2 py-1 text-xs font-medium text-slate-500 transition hover:border-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700"
                  :disabled="submitting"
                  @click="handleRemove(entry.id, entry.layerKey)"
                >
                  Remove
                </button>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  </transition>
</template>

