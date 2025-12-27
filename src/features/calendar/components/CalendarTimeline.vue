<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import MiniCalendar from './MiniCalendar.vue'
import LayerQuickAddForm from './LayerQuickAddForm.vue'
import Popover from 'primevue/popover'
import { useCalendarStore } from '@stores/useCalendarStore'
import Card from './ui/Card.vue'
import EmptyState from './ui/EmptyState.vue'

import type {
  Calendar,
  ScheduledItem,
} from '@/features/calendar/types/calendar'

const props = defineProps<{
  calendar: Calendar
  selectedDayId: string | null
  viewDate: Date
}>()
const emit = defineEmits<{
  (e: 'update:viewDate', d: Date): void
  (e: 'jump', d: Date): void
  (e: 'select-day', dayId: string): void
}>()

const store = useCalendarStore()
const quickAddPopover = ref<InstanceType<typeof Popover> | null>(null)
const quickAddButtonRef = ref<HTMLElement | null>(null)
const quickAddOpen = ref(false)
const isCreatingLayer = ref(false)
const layerError = ref<string | null>(null)
const formInstanceKey = ref(0)
const deletingLayerKey = ref<string | null>(null)

// Keep a local month for the mini calendar so arrow navigation doesn't move the big calendar.
const miniDate = ref(new Date(props.viewDate))
watch(
  () => props.viewDate,
  (d) => {
    miniDate.value = new Date(d)
  }
)

function handleQuickAddToggle(event: Event) {
  if (isCreatingLayer.value) {
    return
  }
  if (quickAddOpen.value) {
    quickAddPopover.value?.hide()
    return
  }
  quickAddOpen.value = true
  if (quickAddButtonRef.value) {
    quickAddPopover.value?.show(event, quickAddButtonRef.value)
  }
}

function handlePopoverHide() {
  quickAddOpen.value = false
  layerError.value = null
  formInstanceKey.value += 1
}

async function handleDeleteLayer(layerKey: string) {
  if (!confirm(`Delete this layer? All events in this layer will be removed.`)) {
    return
  }

  deletingLayerKey.value = layerKey
  try {
    await store.deleteLayerForActiveCalendar(layerKey)
  } catch (error) {
    console.error('Failed to delete layer:', error)
    alert(error instanceof Error ? error.message : 'Failed to delete layer')
  } finally {
    deletingLayerKey.value = null
  }
}

function handlePopoverCancel() {
  if (isCreatingLayer.value) {
    return
  }
  quickAddPopover.value?.hide()
}

async function handleLayerSubmit(payload: {
  name: string
  color: string
  kind: 'standard' | 'exception'
}) {
  if (isCreatingLayer.value) return
  layerError.value = null
  isCreatingLayer.value = true
  try {
    await store.createLayerForActiveCalendar({
      name: payload.name,
      color: payload.color,
      kind: payload.kind,
      chainBehavior: payload.kind === 'exception' ? 'independent' : 'linked',
    })
    quickAddPopover.value?.hide()
    quickAddOpen.value = false
    formInstanceKey.value += 1
  } catch (error) {
    layerError.value =
      error instanceof Error ? error.message : 'Failed to create layer'
  } finally {
    isCreatingLayer.value = false
  }
}

const popoverPt = {
  root: {
    class:
      'w-[min(420px,80vw)] rounded-2xl border border-slate-200 bg-white/95 p-0 shadow-2xl dark:border-slate-700 dark:bg-slate-900',
  },
  content: {
    class: 'p-1',
  },
} as const

const upcomingItems = computed<ScheduledItem[]>(() => {
  const today = new Date()
  const sorted = [...props.calendar.scheduledItems].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  const future = sorted.filter(
    (item) => new Date(item.date).getTime() >= today.setHours(0, 0, 0, 0)
  )
  return future.slice(0, 6)
})

import { formatDate as formatDateUtil } from '@/features/calendar/composables/useDateUtils'

function formatDate(date: Date | null): string {
  return formatDateUtil(date, { month: 'short', day: 'numeric', year: 'numeric' })
}

</script>

<template>
  <Card padding="lg" class="flex flex-col gap-5">
    <header>
      <h2 class="text-lg font-semibold text-slate-900 dark:text-white">{{ calendar.name }}</h2>
      <p class="text-sm text-slate-500 dark:text-slate-400">
        {{ calendar.layers.length }} layer<span v-if="calendar.layers.length !== 1">s</span>
      </p>
    </header>

    <section class="border-t border-slate-200 pt-4 dark:border-slate-700">
      <MiniCalendar
        :model-value="miniDate"
        @update:model-value="(d) => (miniDate = d)"
        @select="(d) => { emit('update:viewDate', d); emit('jump', d) }"
      />
    </section>

    <section class="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-base font-semibold text-slate-900 dark:text-white">Layers</h3>
        <div class="relative">
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/70"
            :aria-pressed="quickAddOpen"
            :disabled="isCreatingLayer"
            ref="quickAddButtonRef"
            @click="handleQuickAddToggle"
          >
            <span aria-hidden="true">+</span>
            <span class="sr-only">
              {{ quickAddOpen ? 'Hide layer form' : 'Show layer form' }}
            </span>
          </button>

          <Popover
            ref="quickAddPopover"
            :dismissable="!isCreatingLayer"
            :show-close-icon="false"
            :focus-on-show="false"
            :pt="popoverPt"
            @hide="handlePopoverHide"
          >
            <div role="dialog" aria-label="Quick add layer">
              <LayerQuickAddForm
                :key="formInstanceKey"
                :submitting="isCreatingLayer"
                :error-message="layerError"
                @submit="handleLayerSubmit"
                @cancel="handlePopoverCancel"
              />
            </div>
          </Popover>
        </div>
      </div>
      <ul class="space-y-2">
        <li
          v-for="layer in calendar.layers"
          :key="layer.key"
          class="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/60"
        >
          <label class="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3">
            <input
              type="checkbox"
              :checked="store.visibleLayerKeys.includes(layer.key)"
              class="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand dark:border-slate-600"
              @change="store.setLayerVisibility(layer.key, ($event.target as HTMLInputElement).checked)"
            />
            <span
              class="h-3.5 w-3.5 rounded border border-slate-200 dark:border-slate-600"
              :style="{ backgroundColor: layer.color || '#64748b' }"
            />
            <div class="flex flex-1 items-center gap-2">
              <span class="font-medium text-slate-700 dark:text-slate-200">{{ layer.name }}</span>
              <span
                v-if="layer.chainBehavior === 'linked'"
                class="rounded-full bg-blue-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                title="Linked: Moving an item in this layer will shift other items in the same layer to maintain the sequence"
              >
                Linked
              </span>
              <span
                v-else-if="layer.kind === 'exception'"
                class="rounded-full bg-orange-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-orange-700 dark:bg-orange-500/20 dark:text-orange-300"
                title="Exception: Dates in this layer block scheduling in other layers"
              >
                Exception
              </span>
            </div>
            <button
              v-if="calendar.layers.length > 1"
              type="button"
              class="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-700 dark:hover:text-red-400"
              :disabled="deletingLayerKey === layer.key || store.isLoading"
              :title="`Delete ${layer.name} layer`"
              @click="handleDeleteLayer(layer.key)"
            >
              <span aria-hidden="true">×</span>
              <span class="sr-only">Delete {{ layer.name }} layer</span>
            </button>
            <input
              class="h-5 w-10 cursor-pointer rounded border border-slate-200 bg-transparent p-0 dark:border-slate-600"
              type="color"
              :value="layer.color || '#64748b'"
              title="Color"
              @input="(e) => { const v = (e.target as HTMLInputElement).value; store.updateLayerColor(layer.key, v); store.schedulePersistLayerColor(layer.key, v, 1200) }"
              @change="(e) => { const v = (e.target as HTMLInputElement).value; store.persistLayerColor(layer.key, v) }"
            />
          </label>
        </li>
      </ul>
    </section>

    <section class="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
      <h3 class="text-base font-semibold text-slate-900 dark:text-white">Upcoming items</h3>
      <ul class="space-y-2">
        <li
          v-for="item in upcomingItems"
          :key="item.id"
        >
          <button
            type="button"
            class="grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border border-transparent bg-slate-100 px-3 py-2 text-left text-sm text-slate-700 transition hover:border-slate-200 hover:bg-slate-50 dark:bg-slate-800/60 dark:text-slate-200"
            :class="{ 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/20 dark:text-blue-100': selectedDayId === item.id }"
            @click="emit('select-day', item.id)"
          >
            <span class="font-semibold">{{ item.title }}</span>
            <span class="text-xs text-slate-500 dark:text-slate-400">{{ formatDate(new Date(item.date)) }}</span>
            <span class="rounded-full bg-blue-50 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-blue-600 dark:bg-blue-500/20 dark:text-blue-100">
              {{ item.layerKey }}
            </span>
          </button>
        </li>
      </ul>
      <EmptyState
        v-if="upcomingItems.length === 0"
        description="You're ahead of schedule! No remaining items scheduled."
        class="text-center"
      />
    </section>
  </Card>
</template>

