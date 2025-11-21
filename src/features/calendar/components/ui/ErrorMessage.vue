<script setup lang="ts">
defineProps<{
  message: string | null
}>()
</script>

<template>
  <div
    v-if="message"
    class="rounded-xl border border-red-200/50 bg-red-100/60 px-4 py-3 text-red-700 dark:border-red-800/50 dark:bg-red-900/30 dark:text-red-300"
    role="alert"
  >
    {{ message }}
  </div>
</template>

