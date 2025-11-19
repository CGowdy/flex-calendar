<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

const GHOST_OVERLAP_TWEAK_PX = 1

const props = defineProps<{
  label: string
  color: string
  width?: string
  showLabel: boolean
  isGhost: boolean
  ghostStyle: 'connected' | 'dashed'
  connectsLeft: boolean
  connectsRight: boolean
  isSelected?: boolean
  isContinuation?: boolean
  cellGapPx: number
  cellPaddingPx: number
  description?: string
  highlighted?: boolean
  treatAsHead?: boolean
}>()

const attrs = useAttrs()

const componentTag = computed(() => (props.isGhost ? 'div' : 'button'))

const baseClasses = computed(() => [
  'relative flex flex-none items-center gap-2 border px-2 py-1 text-xs font-medium transition',
  props.isGhost
    ? 'pointer-events-none text-slate-600 shadow-inner dark:text-slate-200 h-[25.8px]'
    : 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200 h-[25.8px]',
  props.isSelected
    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/20 dark:text-blue-100'
    : 'border-transparent',
  props.isGhost ? 'z-10' : 'z-20',
  props.isContinuation && !props.showLabel ? 'opacity-90 italic' : '',
])

const resolvedConnectLeft = computed(() =>
  props.treatAsHead ? false : props.connectsLeft
)
const resolvedConnectRight = computed(() => props.connectsRight)

const shapeClasses = computed(() => ({
  'rounded-l-full': !resolvedConnectLeft.value,
  'rounded-r-full': !resolvedConnectRight.value,
  'rounded-none': resolvedConnectLeft.value && resolvedConnectRight.value,
}))

const highlightOutlineStyle = computed(() => {
  if (!props.highlighted || props.isGhost) return {}
  const style: Record<string, string> = {
    borderColor: props.color,
    borderStyle: 'solid',
    opacity: '0.7',
  }
  if (props.connectsLeft) {
    style.borderLeftColor = 'transparent'
    style.borderLeftWidth = '0px'
  }
  if (props.connectsRight) {
    style.borderRightColor = 'transparent'
    style.borderRightWidth = '0px'
  }
  return style
})

const computedStyle = computed(() => {
  const baseWidth = props.width ?? '100%'
  const insetLeft = resolvedConnectLeft.value ? 0 : props.cellPaddingPx
  const insetRight = resolvedConnectRight.value ? 0 : props.cellPaddingPx
  const stretchLeft = resolvedConnectLeft.value ? props.cellGapPx : 0
  const stretchRight = resolvedConnectRight.value ? props.cellGapPx : 0
  const insetTotal = insetLeft + insetRight
  const ghostLeftTweak =
    props.isGhost && resolvedConnectLeft.value ? GHOST_OVERLAP_TWEAK_PX : 0
  const ghostRightTweak =
    props.isGhost && resolvedConnectRight.value ? GHOST_OVERLAP_TWEAK_PX : 0
  const effectiveStretchLeft = resolvedConnectLeft.value
    ? Math.max(stretchLeft - ghostLeftTweak, 0)
    : 0
  const effectiveStretchRight = resolvedConnectRight.value
    ? Math.max(stretchRight - ghostRightTweak, 0)
    : 0
  const effectiveStretchTotal = effectiveStretchLeft + effectiveStretchRight
  const width =
    insetTotal === 0 && effectiveStretchTotal === 0
      ? baseWidth
      : `calc(${baseWidth} - ${insetTotal}px + ${effectiveStretchTotal}px)`
  return {
    width,
    marginLeft: resolvedConnectLeft.value ? `-${effectiveStretchLeft}px` : `${insetLeft}px`,
    marginRight: resolvedConnectRight.value ? `-${effectiveStretchRight}px` : `${insetRight}px`,
  }
})

const ghostStyle = computed(() => {
  if (!props.isGhost) return {}
  if (props.ghostStyle === 'dashed') {
    return {
      borderStyle: 'dashed',
      borderColor: props.color,
    }
  }
  return {
    borderColor: 'transparent',
    backgroundImage: `repeating-linear-gradient(135deg, ${props.color}33 0 10px, transparent 10px 16.5px)`,
    backgroundColor: `${props.color}1f`,
    color: props.color,
    boxShadow: 'none',
  }
})
</script>

<template>
  <component
    :is="componentTag"
    v-bind="attrs"
    :class="[baseClasses, shapeClasses, isGhost ? 'justify-center' : 'justify-start']"
    :style="[computedStyle, ghostStyle]"
    :draggable="props.isGhost ? undefined : attrs.draggable"
  >
    <span
      v-if="highlighted && !isGhost"
      class="pointer-events-none absolute inset-0 border-2 border-transparent"
      :class="shapeClasses"
      :style="highlightOutlineStyle"
      aria-hidden="true"
    ></span>
    <template v-if="isGhost">
      <span v-if="ghostStyle === 'dashed'" class="flex w-full items-center gap-1">
        <span class="h-px flex-1 border-t border-dashed border-current" />
        <span class="text-xs">⋯</span>
        <span class="h-px flex-1 border-t border-dashed border-current" />
      </span>
    </template>
    <template v-else>
      <span
        v-if="showLabel"
        class="h-2 w-2 rounded-full"
        :style="{ backgroundColor: color }"
      />
      <span class="truncate">
        <template v-if="showLabel">{{ label }}</template>
      </span>
      <span
        v-if="showLabel && description"
        class="hidden text-[0.65rem] text-slate-500 dark:text-slate-400 md:inline"
      >
        {{ description }}
      </span>
    </template>
  </component>
</template>

