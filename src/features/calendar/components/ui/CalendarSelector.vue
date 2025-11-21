<script setup lang="ts">
import type { CalendarSummary } from '@/features/calendar/types/calendar'

const props = defineProps<{
  calendars: CalendarSummary[]
  selectedId: string | null
  disabled?: boolean
  createOptionLabel?: string
}>()

const emit = defineEmits<{
  (event: 'update:selectedId', id: string | null): void
  (event: 'create'): void
}>()

const CREATE_CALENDAR_OPTION = '__create__'

function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const nextId = target.value
  if (nextId === CREATE_CALENDAR_OPTION) {
    emit('create')
    // Reset to previous selection
    target.value = props.selectedId ?? ''
    return
  }

  if (!nextId) {
    emit('update:selectedId', null)
    return
  }
  emit('update:selectedId', nextId)
}
</script>

<template>
  <select
    class="min-w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
    :value="selectedId ?? ''"
    :disabled="disabled"
    @change="handleChange"
  >
    <option value="" disabled>Select a calendar</option>
    <option
      v-for="calendar in calendars"
      :key="calendar.id"
      :value="calendar.id"
    >
      {{ calendar.name }}
    </option>
    <option :value="CREATE_CALENDAR_OPTION">
      {{ createOptionLabel ?? '+ Create new calendar…' }}
    </option>
  </select>
</template>

