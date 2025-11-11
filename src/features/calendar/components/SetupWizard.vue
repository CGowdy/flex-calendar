<script setup lang="ts">
import { computed, reactive } from 'vue'

import type { CreateCalendarRequest } from '../types/calendar'

const props = defineProps<{
  submitting?: boolean
}>()

const emit = defineEmits<{
  (event: 'submit', payload: CreateCalendarRequest): void
  (event: 'cancel'): void
}>()

interface GroupingOption {
  key: string
  name: string
  color: string
  autoShift: boolean
  selected: boolean
  description: string
  titlePattern: string
}

const groupingOptions = reactive<GroupingOption[]>([
  {
    key: 'abeka',
    name: 'Abeka',
    color: '#2563eb',
    autoShift: true,
    selected: true,
    description: 'Primary schedule from Abeka lesson plans.',
    titlePattern: 'Lesson {n}',
  },
  {
    key: 'student-a',
    name: 'Student A',
    color: '#059669',
    autoShift: true,
    selected: true,
    description: 'First student-specific pacing alignment.',
    titlePattern: '',
  },
  {
    key: 'student-b',
    name: 'Student B',
    color: '#7c3aed',
    autoShift: true,
    selected: false,
    description: 'Optional second student schedule.',
    titlePattern: '',
  },
  {
    key: 'holidays',
    name: 'Holidays / Breaks',
    color: '#f97316',
    autoShift: false,
    selected: true,
    description: 'Non instructional days that should not shift.',
    titlePattern: '',
  },
])

const form = reactive({
  name: 'My Abeka School Year',
  startDate: new Date().toISOString().slice(0, 10),
  totalDays: 170,
  includeWeekends: false,
  includeHolidays: false,
})

const isValid = computed(
  () =>
    form.name.trim().length > 0 &&
    form.startDate.length > 0 &&
    form.totalDays > 0 &&
    groupingOptions.some((grouping) => grouping.selected)
)

function handleSubmit() {
  if (!isValid.value || props.submitting) {
    return
  }

  const groupings = groupingOptions
    .filter((grouping) => grouping.selected)
    .map((grouping) => ({
      key: grouping.key,
      name: grouping.name,
      color: grouping.color,
      autoShift: grouping.autoShift,
      description: grouping.description,
      titlePattern: grouping.titlePattern?.trim()
        ? grouping.titlePattern.trim()
        : undefined,
    }))

  emit('submit', {
    name: form.name.trim(),
    startDate: new Date(form.startDate).toISOString(),
    totalDays: form.totalDays,
    includeWeekends: form.includeWeekends,
    includeHolidays: form.includeHolidays,
    groupings,
  })
}

function toggleGroupAutoShift(option: GroupingOption) {
  option.autoShift = !option.autoShift
}

function toggleGrouping(option: GroupingOption) {
  option.selected = !option.selected
}
</script>

<template>
  <div class="wizard-backdrop" role="dialog" aria-modal="true">
    <div class="wizard-card">
      <header class="wizard-card__header">
        <div>
          <h2>Create Academic Calendar</h2>
          <p>
            Import Abeka pacing and customize how your family’s schedule lines up
            with holidays, weekends, and student-specific goals.
          </p>
        </div>

        <button
          type="button"
          class="icon-button"
          :disabled="submitting"
          @click="emit('cancel')"
          aria-label="Close setup wizard"
        >
          ✕
        </button>
      </header>

      <form class="wizard-form" @submit.prevent="handleSubmit">
        <section class="wizard-form__section">
          <label class="field">
            <span>Calendar name</span>
            <input
              v-model="form.name"
              type="text"
              required
              placeholder="Family Homeschool 2025"
            />
          </label>

          <div class="field-row">
            <label class="field">
              <span>Start date</span>
              <input
                v-model="form.startDate"
                type="date"
                required
              />
            </label>

            <label class="field">
              <span>Total instructional days</span>
              <input
                v-model.number="form.totalDays"
                type="number"
                min="1"
                placeholder="170"
                required
              />
            </label>
          </div>

          <div class="toggles">
            <label class="toggle">
              <input
                v-model="form.includeWeekends"
                type="checkbox"
              />
              <span>Include weekends as instructional days</span>
            </label>

            <label class="toggle">
              <input
                v-model="form.includeHolidays"
                type="checkbox"
              />
              <span>Allow holidays to shift with the schedule</span>
            </label>
          </div>
        </section>

        <section class="wizard-form__section">
          <h3>Grouping tracks</h3>
          <p class="section-hint">
            Choose the tracks that should stay in sync when lessons move. Disable
            automatic shifting for tracks like holidays or special events.
          </p>

          <ul class="grouping-list">
            <li
              v-for="grouping in groupingOptions"
              :key="grouping.key"
              class="grouping-card"
            >
              <div class="grouping-card__header">
                <label class="toggle">
                  <input
                    type="checkbox"
                    :checked="grouping.selected"
                    :disabled="submitting"
                    @change="toggleGrouping(grouping)"
                  />
                  <span>{{ grouping.name }}</span>
                </label>
                <span
                  class="color-badge"
                  :style="{ backgroundColor: grouping.color }"
                  aria-hidden="true"
                />
              </div>

              <p class="grouping-description">
                {{ grouping.description }}
              </p>

              <label class="toggle inline">
                <input
                  type="checkbox"
                  :checked="grouping.autoShift"
                  :disabled="!grouping.selected || submitting"
                  @change="toggleGroupAutoShift(grouping)"
                />
                <span>Shift automatically when lessons move</span>
              </label>

              <label class="field">
                <span>Event title pattern (use {n} for day number)</span>
                <input
                  v-model="grouping.titlePattern"
                  type="text"
                  :placeholder="'Lesson {n}'"
                  :disabled="!grouping.selected || submitting"
                />
              </label>
            </li>
          </ul>
        </section>

        <footer class="wizard-form__footer">
          <button
            type="button"
            class="secondary-button"
            :disabled="submitting"
            @click="emit('cancel')"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="primary-button"
            :disabled="!isValid || submitting"
          >
            <span v-if="submitting">Creating…</span>
            <span v-else>Save calendar</span>
          </button>
        </footer>
      </form>
    </div>
  </div>
</template>

<style scoped>
.wizard-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: grid;
  place-items: center;
  padding: 1.5rem;
  z-index: 50;
}

.wizard-card {
  width: min(760px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  background: var(--color-background);
  border-radius: 1.25rem;
  box-shadow: 0 30px 60px -30px rgba(15, 23, 42, 0.45);
  padding: 1.75rem;
}

.wizard-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.wizard-card__header h2 {
  margin-bottom: 0.35rem;
}

.wizard-card__header p {
  color: var(--color-text);
  opacity: 0.75;
}

.icon-button {
  border: none;
  background: transparent;
  padding: 0.35rem;
  font-size: 1.125rem;
  cursor: pointer;
  color: var(--color-text);
  border-radius: 0.5rem;
  transition: background-color 0.2s ease;
}

.icon-button:hover:not(:disabled) {
  background: rgba(37, 99, 235, 0.08);
}

.wizard-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.wizard-form__section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1 1 auto;
}

.field span {
  font-size: 0.85rem;
  font-weight: 600;
}

.field input {
  appearance: none;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  padding: 0.65rem 0.75rem;
  font-size: 0.95rem;
  background: var(--color-background-soft);
}

.field-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.toggles {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin-top: 0.5rem;
}

.toggle {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.9rem;
  cursor: pointer;
}

.toggle input {
  width: 1rem;
  height: 1rem;
}

.section-hint {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.7;
}

.grouping-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 1rem;
}

.grouping-card {
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  padding: 1rem;
  background: var(--color-background-soft);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.grouping-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.grouping-description {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.75;
  line-height: 1.4;
}

.color-badge {
  width: 1rem;
  height: 1rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.toggle.inline {
  font-size: 0.85rem;
}

.wizard-form__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.secondary-button {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
  padding: 0.55rem 1rem;
  border-radius: 0.75rem;
  cursor: pointer;
}

.primary-button {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  padding: 0.6rem 1.4rem;
  border-radius: 0.75rem;
  border: none;
  cursor: pointer;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  box-shadow: 0 18px 32px -18px rgba(37, 99, 235, 0.6);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  box-shadow: none;
}

.primary-button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 20px 36px -18px rgba(37, 99, 235, 0.6);
}

@media (max-width: 640px) {
  .wizard-card {
    padding: 1.25rem;
  }

  .field-row {
    flex-direction: column;
  }

  .wizard-form__footer {
    flex-direction: column-reverse;
  }

  .wizard-form__footer button {
    width: 100%;
  }
}
</style>

