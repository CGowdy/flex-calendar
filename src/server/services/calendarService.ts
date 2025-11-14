import { Types } from 'mongoose'

import {
  CalendarModel,
  type Calendar,
  type CalendarDocument,
  type CalendarLayer,
  type CalendarEvent,
  type ScheduledItem,
} from '../models/calendarModel.js'
import type {
  CalendarDTO,
  CalendarLayerDTO,
  CalendarEventDTO,
  CalendarSummaryDTO,
  ScheduledItemDTO,
} from '../types/calendar.js'
import type {
  CreateCalendarInput,
  ShiftScheduledItemsInput,
  UpdateCalendarInput,
} from '../schemas/calendarSchemas.js'
import {
  addDays,
  addValidSchoolDays,
  countValidDaySpan,
  generateValidSchoolDates,
  getHolidayDates,
  nextSchoolDate,
} from '../utils/dateUtils.js'
import { nanoid } from '../utils/id.js'

type ScheduledItemSubdocument = CalendarDocument['scheduledItems'][number]
type CalendarLayerSubdocument = CalendarDocument['layers'][number]

const DEFAULT_LAYERS: Array<
  CalendarLayer & {
    templateConfig?: {
      mode: 'generated' | 'manual'
      itemCount?: number
      titlePattern?: string
    }
  }
> = [
  {
    key: 'reference',
    name: 'Reference Plan',
    color: '#2563eb',
    description: 'Template sequence used as the baseline plan.',
    autoShift: true,
    kind: 'standard',
    templateConfig: { mode: 'generated', itemCount: 170, titlePattern: 'Day {n}' },
  },
  {
    key: 'exceptions',
    name: 'Exceptions',
    color: '#f97316',
    description: 'Dates to skip (holidays, blackout days, pauses).',
    autoShift: false,
    kind: 'exception',
    templateConfig: { mode: 'manual' },
  },
]

function toLayerDTO(layer: CalendarLayer): CalendarLayerDTO {
  return {
    key: layer.key,
    name: layer.name,
    color: layer.color ?? '',
    description: layer.description ?? '',
    chainBehavior: layer.autoShift ? 'linked' : 'independent',
    kind: layer.key === 'exceptions' ? 'exception' : 'standard',
  }
}

function toEventDTO(event: CalendarEvent): CalendarEventDTO {
  const enrichedEvent = event as CalendarEvent & { id?: string }
  return {
    id: enrichedEvent.id ?? enrichedEvent._id,
    title: enrichedEvent.title,
    description: enrichedEvent.description ?? '',
    durationDays: enrichedEvent.durationDays ?? 1,
    metadata: (enrichedEvent.metadata ?? {}) as Record<string, unknown>,
  }
}

function toScheduledItemDTO(item: ScheduledItem): ScheduledItemDTO {
  const enrichedItem = item as ScheduledItem & { id?: string }
  return {
    id: enrichedItem.id ?? enrichedItem._id,
    date: new Date(enrichedItem.date),
    layerKey: enrichedItem.layerKey,
    sequenceIndex: enrichedItem.sequenceIndex ?? enrichedItem.groupingSequence,
    label: enrichedItem.label,
    notes: enrichedItem.notes ?? '',
    events: Array.isArray(enrichedItem.events)
      ? enrichedItem.events.map((event) => toEventDTO(event))
      : [],
  }
}

function toCalendarDTO(calendar: CalendarDocument): CalendarDTO {
  const json = calendar.toJSON() as unknown as Calendar & { id: string }

  return {
    id: json.id,
    name: json.name,
    presetKey: json.presetKey || json.source,
    startDate: new Date(json.startDate),
    includeWeekends: json.includeWeekends,
    includeExceptions:
      typeof json.includeExceptions === 'boolean'
        ? json.includeExceptions
        : Boolean(json.includeHolidays),
    layers: (json.layers ?? json.groupings ?? []).map((layer) =>
      toLayerDTO(layer as CalendarLayer)
    ),
    scheduledItems: (json.scheduledItems ?? json.days ?? []).map((item) =>
      toScheduledItemDTO(item as ScheduledItem)
    ),
  }
}

function toCalendarSummary(calendar: CalendarDocument): CalendarSummaryDTO {
  const dto = toCalendarDTO(calendar)
  return {
    id: dto.id,
    name: dto.name,
    startDate: dto.startDate,
    layers: dto.layers,
  }
}

const DEFAULT_TEMPLATE_ITEM_COUNT = 170

function resolveChainBehavior(
  chainBehavior?: 'linked' | 'independent',
  autoShift?: boolean,
  kind: 'standard' | 'exception' = 'standard'
): boolean {
  if (chainBehavior === 'linked') return true
  if (chainBehavior === 'independent') return false
  if (typeof autoShift === 'boolean') return autoShift
  return kind === 'exception' ? false : true
}

type NormalizedLayer = {
  layer: CalendarLayer
  templateConfig?: {
    mode: 'generated' | 'manual'
    itemCount?: number
    titlePattern?: string
  }
}

function normalizeLayers(layers: CreateCalendarInput['layers']): NormalizedLayer[] {
  if (!layers || layers.length === 0) {
    return DEFAULT_LAYERS
  }

  return layers.map((layer) => {
    const kind = layer.kind ?? 'standard'
    const normalized: NormalizedLayer = {
      layer: {
        key: layer.key,
        name: layer.name,
        color: layer.color ?? '',
        description: layer.description ?? '',
        autoShift: resolveChainBehavior(layer.chainBehavior, layer.autoShift, kind),
        kind,
      } as CalendarLayer,
      templateConfig:
        layer.templateConfig ??
        (kind === 'standard'
          ? {
              mode: 'generated',
              itemCount:
                layer.templateConfig?.itemCount ?? DEFAULT_TEMPLATE_ITEM_COUNT,
              titlePattern: layer.titlePattern,
            }
          : { mode: 'manual' }),
    }

    if (layer.titlePattern && !normalized.templateConfig?.titlePattern) {
      normalized.templateConfig = normalized.templateConfig ?? { mode: 'generated' }
      normalized.templateConfig.titlePattern = layer.titlePattern
    }

    return normalized
  })
}

interface GenerateScheduledItemsParams {
  layerKey: string
  layerName: string
  itemCount: number
  startDate: Date
  includeWeekends: boolean
  titlePattern?: string
  templateItems: Array<{
    title: string
    description?: string
    durationDays?: number
  }>
}

function generateScheduledItemsForLayer({
  layerKey,
  layerName,
  itemCount,
  startDate,
  includeWeekends,
  titlePattern,
  templateItems,
  holidayDates,
}: GenerateScheduledItemsParams & { holidayDates?: Set<string> }): ScheduledItem[] {
  const scheduledItems: ScheduledItem[] = []

  // Generate all valid school dates upfront
  const validDates = generateValidSchoolDates(
    startDate,
    itemCount,
    includeWeekends,
    holidayDates
  )

  for (let index = 0; index < itemCount; index += 1) {
    const schoolDate = validDates[index]!
    const sequenceIndex = index + 1

    const templateEvent = templateItems[sequenceIndex - 1]
    const computedTitle =
      templateEvent?.title ??
      (titlePattern && titlePattern.includes('{n}')
        ? titlePattern.replace('{n}', String(sequenceIndex))
        : `${layerName} Item ${sequenceIndex}`)
    const events: CalendarEvent[] = [
      {
        _id: nanoid(),
        title: computedTitle,
        description: templateEvent?.description ?? '',
        durationDays: templateEvent?.durationDays ?? 1,
        metadata: {},
      },
    ]

    scheduledItems.push({
      _id: nanoid(),
      date: schoolDate,
      layerKey,
      sequenceIndex,
      label: `Item ${sequenceIndex}`,
      notes: '',
      events,
    })
  }

  return scheduledItems
}

export async function listCalendars(): Promise<CalendarSummaryDTO[]> {
  const calendars = await CalendarModel.find()
    .select(['name', 'startDate', 'layers'])
    .exec()

  return calendars.map((calendar: CalendarDocument) =>
    toCalendarSummary(calendar)
  )
}

export async function getCalendarById(
  calendarId: string
): Promise<CalendarDTO | null> {
  if (!Types.ObjectId.isValid(calendarId)) {
    return null
  }

  const calendar = await CalendarModel.findById(calendarId).exec()
  if (!calendar) {
    return null
  }

  return toCalendarDTO(calendar)
}

export async function createCalendar(
  payload: CreateCalendarInput
): Promise<CalendarDTO> {
  const includeWeekends = payload.includeWeekends ?? false
  const startDate = new Date(payload.startDate)
  const normalizedLayers = normalizeLayers(payload.layers)

  const templateItemsByLayer = new Map(
    Object.entries(payload.templateItemsByLayer ?? {})
  )

  const exceptionLayerKeys = normalizedLayers
    .filter(({ layer }) => layer.kind === 'exception' || layer.key === 'exceptions')
    .map(({ layer }) => layer.key)

  // For now, exception layers are created empty; scheduler will respect them once populated.
  const holidayDates = new Set<string>()

  const scheduledItems = normalizedLayers.flatMap(({ layer, templateConfig }) => {
    if (
      layer.kind === 'exception' ||
      exceptionLayerKeys.includes(layer.key) ||
      templateConfig?.mode === 'manual'
    ) {
      return []
    }

    const itemCount =
      templateConfig?.itemCount ?? DEFAULT_TEMPLATE_ITEM_COUNT

    return generateScheduledItemsForLayer({
      layerKey: layer.key,
      layerName: layer.name,
      includeWeekends,
      startDate,
      itemCount,
      titlePattern: templateConfig?.titlePattern,
      templateItems: templateItemsByLayer.get(layer.key) ?? [],
      holidayDates,
    })
  })

  const calendar = await CalendarModel.create({
    name: payload.name,
    presetKey: payload.presetKey ?? payload.source ?? 'custom',
    startDate,
    includeWeekends,
    includeExceptions: payload.includeExceptions ?? false,
    layers: normalizedLayers.map(({ layer }) => layer),
    scheduledItems,
  })

  return toCalendarDTO(calendar)
}

export async function shiftScheduledItems(
  calendarId: string,
  payload: ShiftScheduledItemsInput
): Promise<CalendarDTO | null> {
  if (!Types.ObjectId.isValid(calendarId)) {
    return null
  }

  const delta = payload.shiftByDays
  if (delta === 0) {
    return getCalendarById(calendarId)
  }

  const calendar = await CalendarModel.findById(calendarId).exec()
  if (!calendar) {
    return null
  }

  const scheduledItemId = payload.scheduledItemId ?? payload.dayId
  const targetItem = calendar.scheduledItems.find(
    (item: ScheduledItemSubdocument) => item._id === scheduledItemId
  )
  if (!targetItem) {
    return null
  }

  const layerKeys =
    payload.layerKeys && payload.layerKeys.length > 0
      ? payload.layerKeys
      : calendar.layers
          .filter((layer: CalendarLayerSubdocument) => layer.autoShift)
          .map((layer: CalendarLayerSubdocument) => layer.key)

  // Get holiday dates for exclusion
  const holidayDates = getHolidayDates(calendar.scheduledItems)

  // Calculate new date for target day (raw delta shift)
  const rawNewDate = addDays(targetItem.date, delta)

  // Validate and adjust target date to next valid school date if needed
  // This ensures the target day doesn't land on a weekend/holiday (unless weekends are included)
  const newTargetDate = nextSchoolDate(
    rawNewDate,
    calendar.includeWeekends,
    holidayDates
  )

  // Find the starting sequence for reflow
  const startingSequence =
    targetItem.sequenceIndex ?? targetItem.groupingSequence

  // Get all days that need to be reflowed, sorted by sequence
  const itemsToReflow = calendar.scheduledItems
    .filter(
      (item: ScheduledItemSubdocument) =>
        layerKeys.includes(item.layerKey) &&
        (item.sequenceIndex ?? item.groupingSequence) >= startingSequence
    )
    .sort(
      (a: ScheduledItemSubdocument, b: ScheduledItemSubdocument) =>
        (a.sequenceIndex ?? a.groupingSequence) -
        (b.sequenceIndex ?? b.groupingSequence)
    )

  if (itemsToReflow.length === 0) {
    // No items to reflow, just update target item
    targetItem.date = newTargetDate
    calendar.markModified('scheduledItems')
    await calendar.save()
    return toCalendarDTO(calendar)
  }

  // Ensure target day is first (sequence ties)
  const targetIndex = itemsToReflow.findIndex(
    (item: ScheduledItemSubdocument) => item._id === targetItem._id
  )
  if (targetIndex === -1) {
    targetItem.date = newTargetDate
    calendar.markModified('scheduledItems')
    await calendar.save()
    return toCalendarDTO(calendar)
  }
  if (targetIndex > 0) {
    const [targetInList] = itemsToReflow.splice(targetIndex, 1)
    if (targetInList) {
      itemsToReflow.unshift(targetInList)
    }
  }

  // Capture valid-day gaps between consecutive days
  const gapSpans: number[] = []
  for (let i = 0; i < itemsToReflow.length - 1; i++) {
    const current = new Date(itemsToReflow[i]!.date)
    const next = new Date(itemsToReflow[i + 1]!.date)
    const span = countValidDaySpan(
      current,
      next,
      calendar.includeWeekends,
      holidayDates
    )
    gapSpans.push(span > 0 ? span : 1)
  }

  // Set the target day's new date (it's the first in the reflow list)
  const firstItem = itemsToReflow[0]!
  firstItem.date = newTargetDate

  const remainingItems = itemsToReflow.slice(1)

  if (remainingItems.length > 0) {
    let previousDate = newTargetDate
    for (let i = 0; i < remainingItems.length; i++) {
      const span = gapSpans[i] ?? 1
      const nextDate = addValidSchoolDays(
        previousDate,
        span,
        calendar.includeWeekends,
        holidayDates
      )
      remainingItems[i]!.date = nextDate
      previousDate = nextDate
    }
  }

  calendar.markModified('scheduledItems')
  await calendar.save()

  return toCalendarDTO(calendar)
}

export async function updateCalendar(
  calendarId: string,
  payload: UpdateCalendarInput
): Promise<CalendarDTO | null> {
  if (!Types.ObjectId.isValid(calendarId)) {
    return null
  }

  const calendar = await CalendarModel.findById(calendarId).exec()
  if (!calendar) return null

  let modified = false

  if (payload.layers && payload.layers.length > 0) {
    const byKey = new Map(calendar.layers.map((layer) => [layer.key, layer]))
    for (const patch of payload.layers) {
      const target = byKey.get(patch.key)
      if (!target) continue
      if (typeof patch.name === 'string') target.name = patch.name
      if (typeof patch.color === 'string') target.color = patch.color
      if (typeof patch.description === 'string') target.description = patch.description
      if (typeof patch.chainBehavior === 'string') {
        target.autoShift = resolveChainBehavior(
          patch.chainBehavior,
          patch.autoShift,
          patch.kind ?? target.kind ?? 'standard'
        )
      } else if (typeof patch.autoShift === 'boolean') {
        target.autoShift = patch.autoShift
      }
      if (typeof patch.kind === 'string') {
        target.kind = patch.kind
      }
      modified = true
    }
  }

  if (typeof payload.includeWeekends === 'boolean') {
    calendar.includeWeekends = payload.includeWeekends
    modified = true
  }
  if (typeof payload.includeExceptions === 'boolean') {
    calendar.includeExceptions = payload.includeExceptions
    modified = true
  }

  if (modified) {
    calendar.markModified('layers')
    await calendar.save()
  }

  return toCalendarDTO(calendar)
}

