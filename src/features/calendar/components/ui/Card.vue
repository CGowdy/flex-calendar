<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    padding?: 'sm' | 'md' | 'lg' | 'none'
    shadow?: boolean
    border?: boolean
  }>(),
  {
    padding: 'md',
    shadow: true,
    border: true,
  }
)

const cardClasses = computed(() => {
  const base = [
    'rounded-2xl bg-white/95 dark:bg-slate-900',
  ]

  if (props.border) {
    base.push('border border-slate-200/80 dark:border-slate-700/70')
  }

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  }
  base.push(paddingClasses[props.padding])

  if (props.shadow) {
    base.push('shadow-sm')
  }

  return base
})
</script>

<template>
  <div :class="cardClasses">
    <slot />
  </div>
</template>

