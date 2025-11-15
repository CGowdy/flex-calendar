<script setup lang="ts">
import { computed } from 'vue'

import type { Calendar, ScheduledItem } from '@/features/calendar/types/calendar'

const props = defineProps<{
  calendar: Calendar
  selectedDayId: string | null
  visibleLayerKeys?: string[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'select-day', scheduledItemId: string): void
  (
    event: 'shift-day',
    payload: {
      scheduledItemId: string
      shiftByDays: number
      layerKeys?: string[]
    }
  ): void
}>()

const groupedItems = computed(() => {
  const allow = props.visibleLayerKeys
    ? new Set(props.visibleLayerKeys)
    : null
  const groups = new Map<string, ScheduledItem[]>()
  for (const item of props.calendar.scheduledItems) {
    if (allow && !allow.has(item.layerKey)) continue
    if (!groups.has(item.layerKey)) {
      groups.set(item.layerKey, [])
    }
    groups.get(item.layerKey)!.push(item)
  }

  for (const [key, items] of groups.entries()) {
    items.sort(
      (a, b) => (a.sequenceIndex ?? a.groupingSequence) - (b.sequenceIndex ?? b.groupingSequence)
    )
    groups.set(key, items)
  }

  return groups
})

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso))
}

function handleShift(item: ScheduledItem, delta: number) {
  emit('shift-day', {
    scheduledItemId: item.id,
    shiftByDays: delta,
    layerKeys: [item.layerKey],
  })
}
</script>

<template>
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
    <section
      v-for="[layerKey, items] in groupedItems"
      :key="layerKey"
      class="flex max-h-[70vh] flex-col gap-3 overflow-y-auto rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <header>
        <h3 class="text-base font-semibold text-slate-900 dark:text-white">
          {{ calendar.layers.find((layer) => layer.key === layerKey)?.name ?? layerKey }}
        </h3>
        <span class="text-xs text-slate-500 dark:text-slate-400">
          {{ items.length }} item{{ items.length === 1 ? '' : 's' }}
        </span>
      </header>

      <ul class="space-y-3">
        <li
          v-for="item in items"
          :key="item.id"
        >
          <article
            class="flex flex-col gap-3 rounded-xl border border-transparent bg-slate-50/80 p-3 transition hover:border-slate-200 dark:bg-slate-800/50"
            :class="{
              'border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-400 dark:bg-blue-500/20 dark:text-blue-50': selectedDayId === item.id
            }"
          >
            <button
              type="button"
              class="flex flex-col items-start gap-2 text-left"
              :class="disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'"
              :disabled="disabled"
              @click="emit('select-day', item.id)"
            >
              <div class="flex w-full items-center justify-between gap-2">
                <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ item.title }}</span>
                <span class="text-xs text-slate-500 dark:text-slate-400">{{ formatDate(item.date) }}</span>
              </div>

              <p v-if="item.description" class="text-sm text-slate-600 dark:text-slate-300">
                {{ item.description }}
              </p>
            </button>

            <div class="flex gap-2">
              <button
                type="button"
                class="flex-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-400/60 dark:bg-blue-500/10 dark:text-blue-100"
                :disabled="disabled"
                @click="handleShift(item, -1)"
                aria-label="Move lesson earlier by one day"
              >
                −1 day
              </button>
              <button
                type="button"
                class="flex-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-400/60 dark:bg-blue-500/10 dark:text-blue-100"
                :disabled="disabled"
                @click="handleShift(item, 1)"
                aria-label="Move lesson later by one day"
              >
                +1 day
              </button>
            </div>
          </article>
        </li>
      </ul>
    </section>
  </div>
</template>

