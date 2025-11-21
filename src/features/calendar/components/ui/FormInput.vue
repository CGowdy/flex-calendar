<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string | number
    type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'tel' | 'url'
    label?: string
    placeholder?: string
    disabled?: boolean
    required?: boolean
    min?: number | string
    max?: number | string
    rows?: number
    error?: string | null
  }>(),
  {
    type: 'text',
    disabled: false,
    required: false,
  }
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string | number): void
}>()

const inputClasses = computed(() => [
  'rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
  'disabled:cursor-not-allowed disabled:opacity-60',
  'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
  props.error ? 'border-red-300 dark:border-red-700' : '',
])

const isTextarea = computed(() => props.type === 'text' && props.rows !== undefined)

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  const value = props.type === 'number' ? Number(target.value) : target.value
  emit('update:modelValue', value)
}
</script>

<template>
  <label v-if="label || $slots.label" class="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
    <span>
      <slot name="label">{{ label }}</slot>
      <span v-if="required" class="text-red-500">*</span>
    </span>
    <textarea
      v-if="isTextarea"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :rows="rows"
      :class="inputClasses"
      @input="handleInput"
    />
    <input
      v-else
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :min="min"
      :max="max"
      :class="inputClasses"
      @input="handleInput"
    />
    <p v-if="error" class="text-sm text-red-500 dark:text-red-400">
      {{ error }}
    </p>
  </label>
  <div v-else class="flex flex-col gap-2">
    <textarea
      v-if="isTextarea"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :rows="rows"
      :class="inputClasses"
      @input="handleInput"
    />
    <input
      v-else
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :min="min"
      :max="max"
      :class="inputClasses"
      @input="handleInput"
    />
    <p v-if="error" class="text-sm text-red-500 dark:text-red-400">
      {{ error }}
    </p>
  </div>
</template>

