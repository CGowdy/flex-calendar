<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type {
  Calendar,
  CreateScheduledItemRequest,
} from '@/features/calendar/types/calendar'
import Modal from './ui/Modal.vue'
import FormInput from './ui/FormInput.vue'
import Button from './ui/Button.vue'
import ErrorMessage from './ui/ErrorMessage.vue'

const props = defineProps<{
  calendar: Calendar
  open: boolean
  initialDate: string
  busy?: boolean
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'submit', payload: CreateScheduledItemRequest): void
}>()

const form = reactive({
  date: '',
  layerKey: '',
  title: '',
  description: '',
  notes: '',
  durationDays: 1,
})
const formError = reactive({
  message: '',
})

const availableLayers = computed(() =>
  props.calendar.layers.filter((layer) => layer.kind !== 'exception')
)

function resetForm() {
  form.date = props.initialDate ?? new Date().toISOString().slice(0, 10)
  form.layerKey = availableLayers.value[0]?.key ?? ''
  form.title = ''
  form.description = ''
  form.notes = ''
  form.durationDays = 1
  formError.message = ''
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      resetForm()
    }
  },
  { immediate: true }
)

watch(
  () => props.initialDate,
  (next) => {
    if (props.open && next) {
      form.date = next
    }
  }
)

function handleSubmit() {
  if (!form.date || !form.layerKey || form.title.trim().length === 0) {
    formError.message = 'Layer, date, and title are required.'
    return
  }
  const isoDate = new Date(`${form.date}T00:00:00`).toISOString()
  emit('submit', {
    layerKey: form.layerKey,
    date: isoDate,
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    notes: form.notes.trim() || undefined,
    durationDays: form.durationDays || 1,
  })
}
</script>

<template>
  <Modal
    :open="open"
    title="Add event"
    description="Choose a layer, pick the day, and describe the event."
    size="md"
    :busy="busy"
    @close="emit('close')"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <label class="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
        <span>Layer</span>
        <select
          v-model="form.layerKey"
          :disabled="busy || availableLayers.length === 0"
          class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <option
            v-for="layer in availableLayers"
            :key="layer.key"
            :value="layer.key"
          >
            {{ layer.name }}
          </option>
        </select>
      </label>

      <FormInput
        v-model="form.date"
        type="date"
        label="Date"
        :disabled="busy"
        :error="formError.message && !form.date ? 'Date is required' : null"
      />

      <FormInput
        v-model="form.title"
        type="text"
        label="Title"
        placeholder="Event title"
        :disabled="busy"
        required
        :error="formError.message && !form.title.trim() ? 'Title is required' : null"
      />

      <FormInput
        v-model="form.description"
        type="text"
        label="Description (optional)"
        :rows="2"
        :disabled="busy"
      />

      <FormInput
        v-model="form.notes"
        type="text"
        label="Notes (optional)"
        :rows="2"
        :disabled="busy"
      />

      <div class="flex flex-col gap-2">
        <FormInput
          v-model.number="form.durationDays"
          type="number"
          label="Duration (days)"
          :min="1"
          :disabled="busy"
        />
      </div>

      <ErrorMessage :message="formError.message" />

      <div class="flex justify-end gap-3">
        <Button variant="secondary" :disabled="busy" @click="emit('close')">
          Cancel
        </Button>
        <Button type="submit" variant="primary" :disabled="busy">
          <span v-if="busy">Saving…</span>
          <span v-else>Save event</span>
        </Button>
      </div>
    </form>
  </Modal>
</template>


