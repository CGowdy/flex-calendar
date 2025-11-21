<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
  actionLabel?: string
}>()

const emit = defineEmits<{
  (event: 'action'): void
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
    <p v-if="title" class="font-medium">{{ title }}</p>
    <p v-if="description || $slots.default">
      <slot>{{ description }}</slot>
    </p>
    <button
      v-if="actionLabel || $slots.action"
      type="button"
      class="mt-2 inline-flex items-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 px-4 py-2 font-semibold text-white shadow-md transition hover:brightness-110"
      @click="emit('action')"
    >
      <slot name="action">{{ actionLabel }}</slot>
    </button>
  </div>
</template>

