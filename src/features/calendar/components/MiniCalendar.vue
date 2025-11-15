<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: Date
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', d: Date): void
  (e: 'select', d: Date): void
}>()

function startOfMonth(d: Date) {
  const x = new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x
}
function addDays(d: Date, n: number) {
  const x = new Date(d); x.setDate(x.getDate()+n); return x
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
}

const today = new Date()
const weeks = computed(() => {
  const start = startOfMonth(props.modelValue)
  const gridStart = addDays(start, -start.getDay())
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const rows: Date[][] = []
  for (let i=0;i<42;i+=7) rows.push(days.slice(i, i+7))
  return rows
})

function prev() {
  const d = new Date(props.modelValue); d.setMonth(d.getMonth()-1)
  emit('update:modelValue', d)
}
function next() {
  const d = new Date(props.modelValue); d.setMonth(d.getMonth()+1)
  emit('update:modelValue', d)
}
function selectDate(d: Date) {
  emit('update:modelValue', d)
  emit('select', d)
}

const monthLabel = computed(() =>
  new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(props.modelValue)
)
</script>

<template>
  <section class="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900">
    <header class="mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-slate-700 dark:text-slate-100">
      <button
        type="button"
        class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        @click="prev"
        aria-label="Previous month"
      >
        ‹
      </button>
      <strong class="text-sm font-semibold">{{ monthLabel }}</strong>
      <button
        type="button"
        class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        @click="next"
        aria-label="Next month"
      >
        ›
      </button>
    </header>

    <div class="grid grid-cols-7 gap-1 text-xs font-medium">
      <div
        v-for="d in ['S','M','T','W','T','F','S']"
        :key="d"
        class="text-center text-[0.65rem] uppercase tracking-wide text-slate-400 dark:text-slate-500"
      >
        {{ d }}
      </div>

      <template v-for="(row, ri) in weeks" :key="ri">
        <button
          v-for="d in row"
          :key="d.toISOString()"
          type="button"
          class="rounded-md border px-1.5 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          :class="[
            d.getMonth() !== modelValue.getMonth()
              ? 'text-slate-400 dark:text-slate-500'
              : 'text-slate-700 dark:text-slate-100',
            sameDay(d, today)
              ? 'ring-1 ring-blue-400/60 dark:ring-blue-300/50'
              : 'ring-transparent',
            sameDay(d, modelValue)
              ? 'border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-500/20 dark:text-blue-100'
              : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700'
          ]"
          @click="selectDate(d)"
        >
          {{ d.getDate() }}
        </button>
      </template>
    </div>
  </section>
</template>


