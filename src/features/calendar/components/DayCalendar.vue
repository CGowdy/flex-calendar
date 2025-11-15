<script setup lang="ts">
import { computed } from 'vue'
import type { Calendar, ScheduledItem } from '@/features/calendar/types/calendar'

const props = defineProps<{
  calendar: Calendar
  selectedDayId: string | null
}>()

// No emits for now

const selectedItem = computed<ScheduledItem | null>(() => {
  if (!props.selectedDayId) return null
  return (
    props.calendar.scheduledItems.find((item) => item.id === props.selectedDayId) ??
    null
  )
})

const dayLabel = computed(() => {
  const date = selectedItem.value ? new Date(selectedItem.value.date) : null
  return date
    ? new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(date)
    : 'No day selected'
})
</script>

<template>
  <section class="flex flex-col gap-3">
    <header class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
        {{ dayLabel }}
      </h3>
    </header>

    <div v-if="selectedItem" class="grid gap-3">
      <div class="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div class="flex items-center justify-between py-1 text-sm text-slate-500 dark:text-slate-400">
          <span>Title</span>
          <strong class="text-slate-900 dark:text-white">{{ selectedItem.title }}</strong>
        </div>
        <div class="flex items-center justify-between py-1 text-sm text-slate-500 dark:text-slate-400">
          <span>Layer</span>
          <strong class="text-slate-900 dark:text-white">{{ selectedItem.layerKey }}</strong>
        </div>
        <div class="flex items-center justify-between py-1 text-sm text-slate-500 dark:text-slate-400">
          <span>Date</span>
          <strong class="text-slate-900 dark:text-white">{{ new Date(selectedItem.date).toLocaleDateString() }}</strong>
        </div>
        <div class="flex items-center justify-between py-1 text-sm text-slate-500 dark:text-slate-400">
          <span>Duration</span>
          <strong class="text-slate-900 dark:text-white">
            {{ selectedItem.durationDays ?? 1 }} day{{ (selectedItem.durationDays ?? 1) === 1 ? '' : 's' }}
          </strong>
        </div>
      </div>

      <div class="space-y-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div>
          <h4 class="text-base font-semibold text-slate-900 dark:text-white">Description</h4>
          <p v-if="selectedItem.description" class="text-sm text-slate-600 dark:text-slate-300">
            {{ selectedItem.description }}
          </p>
          <p v-else class="text-sm text-slate-500 dark:text-slate-400">No description provided.</p>
        </div>

        <div>
          <h4 class="text-base font-semibold text-slate-900 dark:text-white">Notes</h4>
          <p v-if="selectedItem.notes" class="text-sm text-slate-600 dark:text-slate-300">
            {{ selectedItem.notes }}
          </p>
          <p v-else class="text-sm text-slate-500 dark:text-slate-400">No notes yet.</p>
        </div>
      </div>
    </div>

    <p v-else class="text-sm text-slate-500 dark:text-slate-400">
      Select an item to see details.
    </p>
  </section>
</template>


