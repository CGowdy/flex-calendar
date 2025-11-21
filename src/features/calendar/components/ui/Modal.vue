<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    description?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    busy?: boolean
  }>(),
  {
    size: 'md',
    busy: false,
  }
)

const emit = defineEmits<{
  (event: 'close'): void
}>()

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }
  return sizes[props.size]
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-4 py-8"
      role="dialog"
      aria-modal="true"
      @click.self="emit('close')"
    >
      <div
        :class="[sizeClasses, 'w-full rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900']"
        @click.stop
      >
        <header v-if="title || description || $slots.header" class="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 v-if="title" class="text-xl font-semibold text-slate-900 dark:text-white">
              {{ title }}
            </h2>
            <p v-if="description" class="text-sm text-slate-500 dark:text-slate-400">
              {{ description }}
            </p>
            <slot name="header" />
          </div>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800/70 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="busy"
            @click="emit('close')"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </header>

        <div>
          <slot />
        </div>
      </div>
    </div>
  </Transition>
</template>

