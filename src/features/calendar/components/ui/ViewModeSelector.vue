<script setup lang="ts">
defineProps<{
  modelValue: 'month' | 'week' | 'day' | 'board'
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: 'month' | 'week' | 'day' | 'board'): void
}>()

const modes: Array<{ value: 'month' | 'week' | 'day' | 'board'; label: string }> = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'day', label: 'Day' },
  { value: 'board', label: 'Board' },
]

function selectMode(mode: 'month' | 'week' | 'day' | 'board') {
  emit('update:modelValue', mode)
}
</script>

<template>
  <div class="inline-flex gap-2">
    <button
      v-for="mode in modes"
      :key="mode.value"
      type="button"
      class="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/70"
      :class="{
        'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/20 dark:text-blue-100': modelValue === mode.value
      }"
      @click="selectMode(mode.value)"
    >
      {{ mode.label }}
    </button>
  </div>
</template>

