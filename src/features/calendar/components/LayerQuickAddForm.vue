<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  submitting?: boolean
  errorMessage?: string | null
}>()

const emit = defineEmits<{
  (event: 'submit', payload: { name: string; color: string }): void
  (event: 'cancel'): void
}>()

const name = ref('')
const color = ref('#2563eb')

watch(
  () => props.submitting,
  (next, prev) => {
    if (prev && !next) {
      name.value = ''
      color.value = '#2563eb'
    }
  }
)

function handleSubmit() {
  const trimmed = name.value.trim()
  if (!trimmed || props.submitting) {
    return
  }
  emit('submit', { name: trimmed, color: color.value })
}
</script>

<template>
  <form class="layer-form" @submit.prevent="handleSubmit">
    <header>
      <p class="eyebrow">Add layer</p>
      <h3>Create a new track</h3>
    </header>

    <label class="field">
      <span>Layer name</span>
      <input
        v-model="name"
        type="text"
        placeholder="Marketing plan"
        :disabled="submitting"
        required
      />
    </label>

    <label class="field color-field">
      <span>Color</span>
      <input
        v-model="color"
        type="color"
        :disabled="submitting"
      />
    </label>

    <p v-if="errorMessage" class="error">
      {{ errorMessage }}
    </p>

    <footer class="actions">
      <button
        type="button"
        class="ghost-button"
        :disabled="submitting"
        @click="emit('cancel')"
      >
        Cancel
      </button>
      <button
        type="submit"
        class="primary-button"
        :disabled="submitting || name.trim().length === 0"
      >
        <span v-if="submitting">Saving…</span>
        <span v-else>Add layer</span>
      </button>
    </footer>
  </form>
</template>

<style scoped>
.layer-form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  width: 100%;
}

header {
  margin-bottom: 0.25rem;
}

.eyebrow {
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  color: rgba(148, 163, 184, 0.9);
  margin-bottom: 0.15rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field span {
  font-size: 0.85rem;
  font-weight: 600;
}

.field input[type='text'] {
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 0.65rem;
  padding: 0.55rem 0.8rem;
  font-size: 0.95rem;
  background: rgba(15, 23, 42, 0.4);
  color: var(--color-text);
}

.color-field {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.color-field input[type='color'] {
  width: 2.75rem;
  height: 2rem;
  border: none;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.ghost-button {
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: transparent;
  color: var(--color-text);
  padding: 0.45rem 0.95rem;
  border-radius: 0.65rem;
  cursor: pointer;
}

.ghost-button:disabled,
.primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.primary-button {
  border: none;
  background: linear-gradient(135deg, #6366f1, #2563eb);
  color: #fff;
  padding: 0.5rem 1.25rem;
  border-radius: 0.75rem;
  cursor: pointer;
  font-weight: 600;
  box-shadow: 0 8px 18px -10px rgba(37, 99, 235, 0.6);
}

.error {
  font-size: 0.85rem;
  color: #f87171;
}
</style>


