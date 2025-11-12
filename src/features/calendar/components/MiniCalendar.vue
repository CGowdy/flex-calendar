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
  <section class="mini">
    <header class="mini__header">
      <button class="nav" @click="prev" aria-label="Prev">‹</button>
      <strong>{{ monthLabel }}</strong>
      <button class="nav" @click="next" aria-label="Next">›</button>
    </header>

    <div class="mini__grid">
      <div class="wday" v-for="d in ['S','M','T','W','T','F','S']" :key="d">{{ d }}</div>
      <template v-for="(row, ri) in weeks" :key="ri">
        <button
          v-for="d in row"
          :key="d.toISOString()"
          class="cell"
          :class="{
            'muted': d.getMonth() !== modelValue.getMonth(),
            'today': sameDay(d, today),
            'selected': sameDay(d, modelValue),
          }"
          @click="selectDate(d)"
        >
          {{ d.getDate() }}
        </button>
      </template>
    </div>
  </section>
</template>

<style scoped>
.mini { display: grid; gap: 0.5rem; }
.mini__header { display: flex; justify-content: space-between; align-items: center; }
.nav {
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  padding: 0.1rem 0.4rem;
  border-radius: 0.4rem;
}
.mini__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.wday {
  text-align: center;
  font-size: 0.7rem;
  color: var(--color-text);
  opacity: 0.7;
}
.cell {
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  border-radius: 0.35rem;
  padding: 0.25rem 0;
  font-size: 0.8rem;
  cursor: pointer;
}
.cell.muted { opacity: 0.6; }
.cell.today { outline: 2px solid rgba(37,99,235,0.6); outline-offset: -2px; }
.cell.selected { background: rgba(37,99,235,0.15); border-color: rgba(37,99,235,0.5); }
</style>


