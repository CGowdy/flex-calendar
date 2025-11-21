<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    variant: 'secondary',
    type: 'button',
    disabled: false,
    size: 'md',
  }
)

const buttonClasses = computed(() => {
  const base = [
    'inline-flex items-center justify-center rounded-xl font-medium transition',
    'disabled:cursor-not-allowed disabled:opacity-60',
  ]

  const variants = {
    primary: [
      'bg-gradient-to-r from-blue-600 to-indigo-500',
      'px-4 py-2 text-sm font-semibold text-white shadow-md',
      'hover:brightness-110',
    ],
    secondary: [
      'border border-slate-200 px-4 py-2 text-sm text-slate-700',
      'hover:bg-slate-50',
      'dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/70',
    ],
    danger: [
      'border border-transparent bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-md',
      'hover:bg-red-500',
    ],
    ghost: [
      'border border-transparent px-4 py-2 text-sm text-slate-500',
      'hover:border-slate-200 hover:bg-slate-100',
      'dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800/70',
    ],
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return [...base, ...variants[props.variant], sizes[props.size]]
})
</script>

<template>
  <button :type="type" :class="buttonClasses" :disabled="disabled">
    <slot />
  </button>
</template>

