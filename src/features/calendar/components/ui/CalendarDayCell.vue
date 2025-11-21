<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import type { ScheduledItem } from '@/features/calendar/types/calendar'
import MultiDayBadge from '../MultiDayBadge.vue'
import { dayKey } from '@/features/calendar/composables/useDateUtils'

defineOptions({ inheritAttrs: false })
const attrs = useAttrs()

type DisplayItem = {
  segmentId: string
  base: ScheduledItem
  spanDays: number
  isContinuation: boolean
  isGap: boolean
  isPlaceholder: boolean
  connectLeft?: boolean
  connectRight?: boolean
  showLabel?: boolean
  globalOffset?: number
}

const props = defineProps<{
  date: Date
  displayItems: DisplayItem[]
  selectedDayId: string | null
  hoveredEventId: string | null
  draggingSegmentId: string | null
  isDragging: boolean
  dragOverKey: string | null
  todayIso: string
  isSameMonth: boolean
  visibleMonth: Date
  ghostStyle: 'connected' | 'dashed'
  cellGapPx: number
  cellPaddingPx: number
  getLayerColor: (layerKey: string) => string
}>()

const emit = defineEmits<{
  (event: 'select-day', dayId: string): void
  (event: 'add-event', payload: { date: string }): void
  (event: 'dragstart', payload: { item: ScheduledItem; segmentId: string; segmentOffset: number; ev: DragEvent }): void
  (event: 'dragend'): void
  (event: 'badge-enter', eventId: string): void
  (event: 'badge-leave', eventId: string): void
  (event: 'dragenter', ev: DragEvent): void
  (event: 'dragover', ev: DragEvent): void
  (event: 'dragleave'): void
  (event: 'drop', ev: DragEvent): void
}>()

const dateKey = computed(() => dayKey(props.date))
const isToday = computed(() => dateKey.value === props.todayIso)
const isDragOver = computed(() => props.dragOverKey === dateKey.value)
const isOtherMonth = computed(() => !props.isSameMonth)
</script>

<template>
  <div
    class="group relative min-h-[110px] bg-white p-2 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200"
    :class="[
      attrs.class,
      isOtherMonth ? 'bg-slate-50 text-slate-400 dark:bg-slate-800/40 dark:text-slate-500' : '',
      isToday ? 'ring-2 ring-blue-400/60 ring-offset-1 ring-offset-white dark:ring-offset-slate-900' : '',
      isDragOver ? 'border-2 border-dashed border-blue-400 bg-blue-50/40 dark:bg-blue-500/20' : 'border border-transparent'
    ]"
    :data-date="dateKey"
    @dragenter="emit('dragenter', $event)"
    @dragover="emit('dragover', $event)"
    @dragleave="emit('dragleave')"
    @drop="emit('drop', $event)"
  >
    <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">
      {{ date.getDate() }}
    </div>
    <button
      type="button"
      class="absolute right-2 top-2 hidden rounded-full border border-slate-200 bg-white px-1 text-xs font-semibold text-slate-500 shadow-sm transition hover:bg-slate-100 group-hover:inline-flex dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
      @click.stop="emit('add-event', { date: dateKey })"
      aria-label="Add event"
    >
      +
    </button>

    <ul class="mt-1 flex h-full flex-col gap-1">
      <li
        v-for="display in displayItems"
        :key="display.segmentId"
        class="relative flex"
      >
        <template v-if="display.isGap && !display.isPlaceholder">
          <MultiDayBadge
            data-testid="blocked-gap"
            :data-gap-for="display.base.id"
            :label="display.base.title"
            :color="getLayerColor(display.base.layerKey)"
            width="100%"
            :show-label="false"
            :is-ghost="true"
            :ghost-style="ghostStyle"
            :connects-left="display.connectLeft ?? false"
            :connects-right="display.connectRight ?? false"
            :cell-gap-px="cellGapPx"
            :cell-padding-px="cellPaddingPx"
          />
        </template>
        <template v-else-if="!display.isPlaceholder">
          <MultiDayBadge
            :label="display.base.title"
            :color="getLayerColor(display.base.layerKey)"
            width="100%"
            :show-label="display.showLabel ?? false"
            :is-ghost="false"
            :ghost-style="ghostStyle"
            :connects-left="display.connectLeft ?? false"
            :connects-right="display.connectRight ?? false"
            :is-selected="selectedDayId === display.base.id"
            :is-continuation="display.isContinuation"
            :cell-gap-px="cellGapPx"
            :cell-padding-px="cellPaddingPx"
            :highlighted="hoveredEventId === display.base.id"
            :description="display.base.description"
            :treat-as-head="isDragging && draggingSegmentId === display.segmentId"
            type="button"
            :title="display.isContinuation ? `${display.base.title} (continues)` : display.base.title"
            draggable="true"
            @click="emit('select-day', display.base.id)"
            @dragstart="emit('dragstart', { item: display.base, segmentId: display.segmentId, segmentOffset: display.globalOffset ?? 0, ev: $event })"
            @dragend="emit('dragend')"
            @mouseenter="emit('badge-enter', display.base.id)"
            @mouseleave="emit('badge-leave', display.base.id)"
          />
        </template>
        <template v-else>
          <div
            class="h-[25.8px] w-full opacity-0 pointer-events-none"
            aria-hidden="true"
          />
        </template>
      </li>
    </ul>
  </div>
</template>

