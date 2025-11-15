<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  submitting?: boolean
  errorMessage?: string | null
}>()

const emit = defineEmits<{
  (event: 'submit', payload: { name: string; color: string }): void
  (event: 'cancel'): void
}>()

const name = ref('')
const color = ref('#2563eb')

watch(
  () => props.submitting,
  (next, prev) => {
    if (prev && !next) {
      name.value = ''
      color.value = '#2563eb'
    }
  }
)

function handleSubmit() {
  const trimmed = name.value.trim()
  if (!trimmed || props.submitting) {
    return
  }
  emit('submit', { name: trimmed, color: color.value })
}
</script>

<template>
  <form
    class="flex w-full flex-col gap-4"
    @submit.prevent="handleSubmit"
  >
    <header class="space-y-1">
      <p class="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-slate-400">
        Add layer
      </p>
      <h3 class="text-base font-semibold text-slate-900 dark:text-white">
        Create a new track
      </h3>
    </header>

    <label class="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
      <span>Layer name</span>
      <input
        v-model="name"
        type="text"
        placeholder="Marketing plan"
        :disabled="submitting"
        required
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      />
    </label>

    <label class="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
      <span>Color</span>
      <input
        v-model="color"
        type="color"
        :disabled="submitting"
        class="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 bg-transparent p-0 dark:border-slate-600"
      />
    </label>

    <p v-if="errorMessage" class="text-sm text-red-500">
      {{ errorMessage }}
    </p>

    <footer class="flex flex-col gap-2 sm:flex-row sm:justify-end">
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
        :disabled="submitting || name.trim().length === 0"
      >
        <span v-if="submitting">Saving…</span>
        <span v-else>Add layer</span>
      </button>
    </footer>
  </form>
</template>


