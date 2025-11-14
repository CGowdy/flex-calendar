<script setup lang="ts">
import { computed, reactive } from 'vue'

import type { CreateCalendarRequest } from '@/features/calendar/types/calendar'

const props = defineProps<{
  submitting?: boolean
}>()

const emit = defineEmits<{
  (event: 'submit', payload: CreateCalendarRequest): void
  (event: 'cancel'): void
}>()

const today = new Date()
  .toISOString()
  .slice(0, 10)

const form = reactive({
  name: '',
  startDate: today,
  templateItemCount: 180,
  includeWeekends: false,
  includeExceptions: false,
})

const isValid = computed(
  () =>
    form.name.trim().length > 0 &&
    form.startDate.length > 0 &&
    form.templateItemCount > 0
)

function toISODate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map((value) => Number(value))
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return new Date().toISOString()
  }

  return new Date(Date.UTC(year, month - 1, day)).toISOString()
}

function handleSubmit() {
  if (!isValid.value || props.submitting) {
    return
  }

  const baseLayers: CreateCalendarRequest['layers'] = [
    {
      key: 'reference',
      name: 'Reference Layer',
      chainBehavior: 'linked',
      templateConfig: {
        mode: 'generated',
        itemCount: form.templateItemCount,
        titlePattern: 'Item {n}',
      },
    },
    {
      key: 'progress',
      name: 'Progress Layer',
      chainBehavior: 'linked',
      templateConfig: {
        mode: 'generated',
        itemCount: form.templateItemCount,
        titlePattern: 'Progress {n}',
      },
    },
    {
      key: 'exceptions',
      name: 'Exceptions',
      chainBehavior: 'independent',
      kind: 'exception',
      templateConfig: { mode: 'manual' },
    },
  ]

  emit('submit', {
    name: form.name.trim(),
    startDate: toISODate(form.startDate),
    includeWeekends: form.includeWeekends,
    includeExceptions: form.includeExceptions,
    layers: baseLayers,
  })
}
</script>

<template>
  <form class="quick-add-card" @submit.prevent="handleSubmit">
    <header class="quick-add-card__header">
      <div>
        <p class="quick-add-card__eyebrow">Add calendar</p>
        <h2>Quick create</h2>
        <p class="quick-add-card__hint">
          Start a calendar with a reference layer, a progress layer, and an exceptions lane. You can customize layers later as needed.
        </p>
      </div>

      <button
        type="button"
        class="icon-button"
        :disabled="submitting"
        aria-label="Close quick add form"
        @click="emit('cancel')"
      >
        ✕
      </button>
    </header>

    <div class="quick-add-grid">
      <label class="field">
        <span>Calendar name</span>
        <input
          v-model="form.name"
          type="text"
          placeholder="Content Pipeline 2025"
          :disabled="submitting"
        />
      </label>

      <label class="field">
        <span>Start date</span>
        <input
          v-model="form.startDate"
          type="date"
          :disabled="submitting"
        />
      </label>

      <label class="field">
        <span>Template items per layer</span>
        <input
          v-model.number="form.templateItemCount"
          type="number"
          min="1"
          :disabled="submitting"
        />
      </label>
    </div>

    <div class="quick-add-toggles">
      <label class="toggle">
        <input
          v-model="form.includeWeekends"
          type="checkbox"
          :disabled="submitting"
        />
        <span>Allow weekends in generated layers</span>
      </label>

      <label class="toggle">
        <input
          v-model="form.includeExceptions"
          type="checkbox"
          :disabled="submitting"
        />
        <span>Let exceptions move with shifts</span>
      </label>
    </div>

    <footer class="quick-add-actions">
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
        <span v-if="submitting">Saving…</span>
        <span v-else>Save calendar</span>
      </button>
    </footer>
  </form>
</template>

<style scoped>
.quick-add-card {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  padding: 1.25rem;
  background: var(--color-background);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 20px 45px -30px rgba(15, 23, 42, 0.4);
}

.quick-add-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.quick-add-card__eyebrow {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text);
  opacity: 0.7;
  margin-bottom: 0.25rem;
}

.quick-add-card__hint {
  color: var(--color-text);
  opacity: 0.8;
  max-width: 48ch;
}

.icon-button {
  border: 1px solid transparent;
  background: transparent;
  padding: 0.35rem;
  font-size: 1rem;
  cursor: pointer;
  border-radius: 0.5rem;
  color: var(--color-text);
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.icon-button:hover:not(:disabled) {
  border-color: rgba(37, 99, 235, 0.5);
  background: rgba(37, 99, 235, 0.12);
}

.quick-add-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field span {
  font-size: 0.85rem;
  font-weight: 600;
}

.field input {
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  padding: 0.55rem 0.75rem;
  font-size: 0.95rem;
  background: var(--color-background-soft);
  color: var(--color-text);
}

.quick-add-toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-text);
}

.quick-add-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.secondary-button {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  cursor: pointer;
}

.primary-button {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  padding: 0.55rem 1.25rem;
  border-radius: 0.75rem;
  border: none;
  cursor: pointer;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  box-shadow: 0 18px 32px -18px rgba(37, 99, 235, 0.6);
}

.primary-button:disabled,
.secondary-button:disabled,
.icon-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .quick-add-actions {
    flex-direction: column-reverse;
  }

  .quick-add-actions button {
    width: 100%;
  }
}
</style>

