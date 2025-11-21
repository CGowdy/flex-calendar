<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    onPrev: () => void
    onNext: () => void
    prevLabel?: string
    nextLabel?: string
  }>(),
  {
    prevLabel: 'Previous',
    nextLabel: 'Next',
  }
)
</script>

<template>
  <header class="flex items-center justify-between gap-3">
    <button
      type="button"
      class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/70"
      :aria-label="prevLabel"
      @click="onPrev"
    >
      ‹
    </button>
    <h3 class="text-lg font-semibold text-slate-900 dark:text-white">{{ label }}</h3>
    <button
      type="button"
      class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/70"
      :aria-label="nextLabel"
      @click="onNext"
    >
      ›
    </button>
  </header>
</template>

