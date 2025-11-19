import { Types } from 'mongoose'

import {
  CalendarModel,
  type Calendar,
  type CalendarDocument,
  type CalendarLayer,
  type ScheduledItem,
} from '../models/calendarModel.js'
import type {
  CalendarDTO,
  CalendarLayerDTO,
  CalendarEventDTO,
  CalendarSummaryDTO,
} from '../types/calendar.js'
import type {
  AddScheduledItemInput,
  CreateCalendarInput,
  ShiftScheduledItemsInput,
  SplitScheduledItemInput,
  UnsplitScheduledItemInput,
  UpdateCalendarInput,
  UpdateExceptionsInput,
} from '../schemas/calendarSchemas.js'
import {
  addDays,
  addValidSchoolDays,
  buildExceptionLookup,
  countValidDaySpan,
  generateValidSchoolDates,
  getBlockedDatesForLayer,
  nextSchoolDate,
  normalizeDateInput,
} from '../utils/dateUtils.js'
import { nanoid } from '../utils/id.js'

type ScheduledItemSubdocument = CalendarDocument['scheduledItems'][number]
type CalendarLayerSubdocument = CalendarDocument['layers'][number]

type LayerInput = {
  key: string
  name: string
  color?: string
  description?: string
  chainBehavior?: 'linked' | 'independent'
  autoShift?: boolean
  kind?: 'standard' | 'exception'
  respectsGlobalExceptions?: boolean
  titlePattern?: string
  templateConfig?: {
    mode?: 'generated' | 'manual'
    itemCount?: number
    titlePattern?: string
  }
}

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
    respectsGlobalExceptions: true,
    templateConfig: { mode: 'generated', itemCount: 170, titlePattern: 'Day {n}' },
  },
  {
    key: 'exceptions',
    name: 'Exceptions',
    color: '#f97316',
    description: 'Dates to skip (holidays, blackout days, pauses).',
    autoShift: false,
    kind: 'exception',
    respectsGlobalExceptions: false,
    templateConfig: { mode: 'manual' },
  },
]

function toLayerDTO(layer: CalendarLayer): CalendarLayerDTO {
  const kind: 'standard' | 'exception' =
    layer.kind === 'exception' || layer.key === 'exceptions' ? 'exception' : 'standard'

  return {
    key: layer.key,
    name: layer.name,
    color: layer.color ?? '',
    description: layer.description ?? '',
    chainBehavior: layer.autoShift ? 'linked' : 'independent',
    kind,
    respectsGlobalExceptions: layer.respectsGlobalExceptions ?? true,
  }
}

function toCalendarEventDTO(item: ScheduledItem): CalendarEventDTO {
  const enrichedItem = item as ScheduledItem & { id?: string }
  return {
    id: enrichedItem.id ?? enrichedItem._id,
    date: new Date(enrichedItem.date),
    layerKey: enrichedItem.layerKey,
    sequenceIndex: enrichedItem.sequenceIndex ?? enrichedItem.groupingSequence,
    title: enrichedItem.title,
    description: enrichedItem.description ?? '',
    notes: enrichedItem.notes ?? '',
    durationDays: enrichedItem.durationDays ?? 1,
    metadata: (enrichedItem.metadata ?? {}) as Record<string, unknown>,
    targetLayerKeys: enrichedItem.targetLayerKeys ?? undefined,
    splitGroupId: enrichedItem.splitGroupId,
    splitIndex: enrichedItem.splitIndex,
    splitTotal: enrichedItem.splitTotal,
  }
}

function toCalendarDTO(calendar: CalendarDocument): CalendarDTO {
  const json = calendar.toJSON() as unknown as Calendar & { id: string }

  return {
    id: json.id,
    name: json.name,
    presetKey: json.presetKey || json.source,
    startDate: json.startDate ? new Date(json.startDate) : null,
    includeWeekends: json.includeWeekends,
    includeExceptions:
      typeof json.includeExceptions === 'boolean'
        ? json.includeExceptions
        : Boolean(json.includeHolidays),
    layers: (json.layers ?? json.groupings ?? []).map((layer) =>
      toLayerDTO(layer as CalendarLayer)
    ),
    scheduledItems: (json.scheduledItems ?? json.days ?? []).map((item) =>
      toCalendarEventDTO(item as ScheduledItem)
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
  if (!layers) {
    return DEFAULT_LAYERS.map((layer) => ({
      layer: {
        key: layer.key,
        name: layer.name,
        color: layer.color ?? '',
        description: layer.description ?? '',
        autoShift: layer.autoShift ?? true,
        kind: layer.kind ?? 'standard',
      } as CalendarLayer,
      templateConfig: layer.templateConfig,
    }))
  }

  const definedLayers = layers as LayerInput[]

  if (definedLayers.length === 0) {
    return []
  }

  return definedLayers.map((layer) => {
    const kind = layer.kind ?? 'standard'
    const providedTemplateConfig: NormalizedLayer['templateConfig'] | undefined =
      layer.templateConfig
        ? {
            mode: layer.templateConfig.mode ?? 'generated',
            itemCount: layer.templateConfig.itemCount,
            titlePattern: layer.templateConfig.titlePattern ?? layer.titlePattern,
          }
        : undefined

    const fallbackTemplateConfig: NormalizedLayer['templateConfig'] =
      kind === 'standard'
        ? {
            mode: 'generated' as const,
            itemCount:
              providedTemplateConfig?.itemCount ?? DEFAULT_TEMPLATE_ITEM_COUNT,
            titlePattern: providedTemplateConfig?.titlePattern ?? layer.titlePattern,
          }
        : { mode: 'manual' as const }

    const respectsGlobal =
      typeof layer.respectsGlobalExceptions === 'boolean'
        ? layer.respectsGlobalExceptions
        : true

    const normalized: NormalizedLayer = {
      layer: {
        key: layer.key,
        name: layer.name,
        color: layer.color ?? '',
        description: layer.description ?? '',
        autoShift: resolveChainBehavior(layer.chainBehavior, layer.autoShift, kind),
        kind,
        respectsGlobalExceptions:
          kind === 'exception' ? false : respectsGlobal,
      } as CalendarLayer,
      templateConfig: providedTemplateConfig ?? fallbackTemplateConfig,
    }

    if (layer.titlePattern && !normalized.templateConfig?.titlePattern) {
      normalized.templateConfig =
        normalized.templateConfig ?? { mode: 'generated' as const }
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
  blockedDates,
}: GenerateScheduledItemsParams & { blockedDates?: Set<string> }): ScheduledItem[] {
  const scheduledItems: ScheduledItem[] = []

  // Generate all valid school dates upfront
  const validDates = generateValidSchoolDates(
    startDate,
    itemCount,
    includeWeekends,
    blockedDates
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

    scheduledItems.push({
      _id: nanoid(),
      date: schoolDate,
      layerKey,
      sequenceIndex,
      title: computedTitle,
      description: templateEvent?.description ?? '',
      notes: '',
      durationDays: templateEvent?.durationDays ?? 1,
      metadata: {},
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

export async function updateExceptions(
  calendarId: string,
  payload: UpdateExceptionsInput
): Promise<CalendarDTO | null> {
  if (!Types.ObjectId.isValid(calendarId)) {
    return null
  }

  const calendar = await CalendarModel.findById(calendarId).exec()
  if (!calendar) return null

  // Ensure exceptions layer exists
  const exceptionsKey = payload.layerKey ?? 'exceptions'
  let exceptionsLayer = calendar.layers.find((l) => l.key === exceptionsKey)
  if (!exceptionsLayer) {
    exceptionsLayer = {
      key: exceptionsKey,
      name: 'Exceptions',
      color: '#f97316',
      description: 'Blocked/unavailable dates',
      autoShift: false,
      kind: 'exception',
    } as CalendarLayerSubdocument
    calendar.layers.push(exceptionsLayer)
  } else {
    // Ensure it's treated as exception
    exceptionsLayer.kind = 'exception'
    exceptionsLayer.autoShift = false
  }

  const addEntries = payload.addEntries ?? []
  const removeDates = new Set((payload.removeDates ?? []).map(normalizeDateInput))
  const removeEntryIds = new Set(payload.removeEntryIds ?? [])

  // Remove requested exception events
  const removedDateKeys: string[] = []
  if (removeDates.size > 0 || removeEntryIds.size > 0) {
    calendar.scheduledItems = calendar.scheduledItems.filter((item) => {
      if (item.layerKey !== exceptionsKey) {
        return true
      }

      const dateKey = normalizeDateInput(String(item.date))
      const shouldRemoveByDate = removeDates.has(dateKey)
      const shouldRemoveById =
        removeEntryIds.size > 0 &&
        (removeEntryIds.has(item._id) ||
          removeEntryIds.has(
            (item as ScheduledItemSubdocument & { id?: string }).id ?? ''
          ))

      if (shouldRemoveByDate || shouldRemoveById) {
        removedDateKeys.push(dateKey)
        return false
      }

      return true
    }) as unknown as typeof calendar.scheduledItems
  }

  // Determine existing exception scopes to avoid duplicates
  const existingExceptionScopes = new Set(
    calendar.scheduledItems
      .filter((i) => i.layerKey === exceptionsKey)
      .map((i) => {
        const key = normalizeDateInput(String(i.date))
        const scope =
          i.targetLayerKeys && i.targetLayerKeys.length > 0
            ? [...i.targetLayerKeys].sort().join('|')
            : '*'
        return `${key}|${scope}`
      })
  )

  // Compute next sequence index for exceptions
  const currentMaxSeq = Math.max(
    0,
    ...calendar.scheduledItems
      .filter((i) => i.layerKey === exceptionsKey)
      .map((i) => i.sequenceIndex ?? i.groupingSequence ?? 0)
  )
  let nextSeq = currentMaxSeq + 1

  // Add requested exception events
  const addedDateKeys: string[] = []
  for (const entry of addEntries) {
    const iso = normalizeDateInput(entry.date)
    const sortedTargets =
      entry.targetLayerKeys && entry.targetLayerKeys.length > 0
        ? [...entry.targetLayerKeys].sort()
        : undefined
    const scopeKey = sortedTargets ? sortedTargets.join('|') : '*'
    const dedupeKey = `${iso}|${scopeKey}`
    if (existingExceptionScopes.has(dedupeKey)) continue
    existingExceptionScopes.add(dedupeKey)
    addedDateKeys.push(iso)

    calendar.scheduledItems.push({
      _id: nanoid(),
      date: new Date(iso),
      layerKey: exceptionsKey,
      sequenceIndex: nextSeq++,
      title: entry.title?.trim() || 'Exception',
      description: '',
      notes: '',
      durationDays: 1,
      metadata: {},
      targetLayerKeys: sortedTargets,
    } as unknown as ScheduledItemSubdocument)
  }

  // Reflow linked layers from the earliest affected date
  const changedDates = [
    ...addedDateKeys,
    ...removedDateKeys,
    ...Array.from(removeDates.values()),
  ]
  if (changedDates.length > 0 && calendar.includeExceptions) {
    const minChangedDate = new Date(
      changedDates.sort()[0] as string
    )

    const layerByKey = new Map(
      calendar.layers.map((layer: CalendarLayerSubdocument) => [layer.key, layer])
    )
    const exceptionLayerKeys = new Set(
      calendar.layers
        .filter((layer) => layer.kind === 'exception')
        .map((layer) => layer.key)
    )
    const exceptionLookup = buildExceptionLookup({
      items: calendar.scheduledItems,
      exceptionLayerKeys,
    })
    const includeExceptions = calendar.includeExceptions

    const linkedLayerKeys = calendar.layers
      .filter((layer) => layer.autoShift)
      .map((layer) => layer.key)

    for (const layerKey of linkedLayerKeys) {
      const items = calendar.scheduledItems
        .filter((i) => i.layerKey === layerKey)
        .sort(
          (a, b) =>
            (a.sequenceIndex ?? a.groupingSequence) -
            (b.sequenceIndex ?? b.groupingSequence)
        )

      if (items.length === 0) continue

      // Find first item on/after the changed date
      let startIdx = items.findIndex(
        (i) => new Date(i.date).getTime() >= minChangedDate.getTime()
      )
      if (startIdx === -1) continue

      // Compute original gaps (in valid-day steps) between consecutive items from startIdx
      const gapSpans: number[] = []
      for (let i = startIdx; i < items.length - 1; i++) {
        const current = new Date(items[i]!.date)
        const next = new Date(items[i + 1]!.date)
        const nextLayer = layerByKey.get(items[i + 1]!.layerKey)
        const blockedDatesForNext =
          includeExceptions && nextLayer
            ? getBlockedDatesForLayer(
                nextLayer.key,
                exceptionLookup,
                nextLayer.respectsGlobalExceptions !== false
              )
            : includeExceptions
              ? exceptionLookup.global
              : undefined

        const span = countValidDaySpan(
          current,
          next,
          calendar.includeWeekends,
          blockedDatesForNext
        )
        gapSpans.push(span > 0 ? span : 1)
      }

      // Adjust the first affected item to a valid date (no weekend/exception)
      const first = items[startIdx]!
      const firstLayer = layerByKey.get(first.layerKey)
      const firstBlockedDates =
        includeExceptions && firstLayer
          ? getBlockedDatesForLayer(
              firstLayer.key,
              exceptionLookup,
              firstLayer.respectsGlobalExceptions !== false
            )
          : includeExceptions
            ? exceptionLookup.global
            : undefined
      const adjustedFirstDate = nextSchoolDate(
        new Date(first.date),
        calendar.includeWeekends,
        firstBlockedDates
      )
      first.date = adjustedFirstDate

      // Re-assign subsequent items preserving valid-day gaps
      let prev = adjustedFirstDate
      for (let i = startIdx + 1; i < items.length; i++) {
        const gap = gapSpans[i - (startIdx + 1)] ?? 1
        const nextLayer = layerByKey.get(items[i]!.layerKey)
        const blockedDates =
          includeExceptions && nextLayer
            ? getBlockedDatesForLayer(
                nextLayer.key,
                exceptionLookup,
                nextLayer.respectsGlobalExceptions !== false
              )
            : includeExceptions
              ? exceptionLookup.global
              : undefined
        const nextDate = addValidSchoolDays(
          prev,
          gap,
          calendar.includeWeekends,
          blockedDates
        )
        items[i]!.date = nextDate
        prev = nextDate
      }
    }
  }

  calendar.markModified('layers')
  calendar.markModified('scheduledItems')
  await calendar.save()
  return toCalendarDTO(calendar)
}

export async function addScheduledItem(
  calendarId: string,
  payload: AddScheduledItemInput
): Promise<CalendarDTO | null> {
  if (!Types.ObjectId.isValid(calendarId)) {
    return null
  }

  const calendar = await CalendarModel.findById(calendarId).exec()
  if (!calendar) {
    return null
  }

  const layer = calendar.layers.find(
    (entry: CalendarLayerSubdocument) => entry.key === payload.layerKey
  )
  if (!layer) {
    throw new Error('Layer not found')
  }

  const normalizedDate = new Date(payload.date)
  if (Number.isNaN(normalizedDate.getTime())) {
    throw new Error('Invalid date')
  }
  normalizedDate.setHours(0, 0, 0, 0)

  const newItem: ScheduledItemSubdocument = {
    _id: nanoid(),
    date: normalizedDate,
    layerKey: payload.layerKey,
    sequenceIndex: 1,
    title: payload.title.trim(),
    description: payload.description ?? '',
    notes: payload.notes ?? '',
    durationDays: payload.durationDays ?? 1,
    metadata: {},
  }

  calendar.scheduledItems.push(newItem)

  const layerItems = calendar.scheduledItems
    .filter((item: ScheduledItemSubdocument) => item.layerKey === payload.layerKey)
    .sort(
      (a: ScheduledItemSubdocument, b: ScheduledItemSubdocument) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    )

  layerItems.forEach((item, index) => {
    item.sequenceIndex = index + 1
  })

  calendar.markModified('scheduledItems')
  await calendar.save()
  return toCalendarDTO(calendar)
}

export async function splitScheduledItem(
  calendarId: string,
  payload: SplitScheduledItemInput
): Promise<CalendarDTO | null> {
  if (!Types.ObjectId.isValid(calendarId)) {
    return null
  }

  const parts = Math.max(2, Math.min(payload.parts ?? 2, 6))
  const calendar = await CalendarModel.findById(calendarId).exec()
  if (!calendar) return null

  const targetItem = calendar.scheduledItems.find(
    (item: ScheduledItemSubdocument) => item._id === payload.scheduledItemId
  )
  if (!targetItem) {
    return null
  }

  if (targetItem.splitTotal && (targetItem.splitTotal ?? 1) > 1) {
    throw new Error('This event has already been split.')
  }

  const layer = calendar.layers.find((layer) => layer.key === targetItem.layerKey)
  if (!layer) {
    return null
  }

  const layerItems = calendar.scheduledItems
    .filter((item: ScheduledItemSubdocument) => item.layerKey === targetItem.layerKey)
    .sort(
      (a: ScheduledItemSubdocument, b: ScheduledItemSubdocument) =>
        (a.sequenceIndex ?? a.groupingSequence) - (b.sequenceIndex ?? b.groupingSequence)
    )
  const targetIdx = layerItems.findIndex((item) => item._id === targetItem._id)
  if (targetIdx === -1) {
    return null
  }

  const originalDates = new Map(
    layerItems.map((item) => [item._id, new Date(item.date)])
  )

  const exceptionLayerKeys = new Set(
    calendar.layers.filter((l) => l.kind === 'exception').map((l) => l.key)
  )
  const exceptionLookup = buildExceptionLookup({
    items: calendar.scheduledItems,
    exceptionLayerKeys,
  })
  const includeExceptions = calendar.includeExceptions
  const blockedDatesForLayer =
    includeExceptions
      ? getBlockedDatesForLayer(
          layer.key,
          exceptionLookup,
          layer.respectsGlobalExceptions !== false
        )
      : undefined

  const includeWeekends = calendar.includeWeekends
  const splitGroupId = nanoid()
  const baseTitle =
    targetItem.title.replace(/\s+\(Part\s+\d+\/\d+\)$/i, '').trim() || targetItem.title

  targetItem.splitGroupId = splitGroupId
  targetItem.splitIndex = 1
  targetItem.splitTotal = parts
  targetItem.title = `${baseTitle} (Part 1/${parts})`

  let previousDate = new Date(targetItem.date)

  for (let idx = 2; idx <= parts; idx += 1) {
    const nextDate = addValidSchoolDays(
      previousDate,
      1,
      includeWeekends,
      blockedDatesForLayer
    )
    const metadataCopy =
      targetItem.metadata && typeof targetItem.metadata === 'object'
        ? { ...targetItem.metadata }
        : {}

    const newPart: ScheduledItemSubdocument = {
      _id: nanoid(),
      date: nextDate,
      layerKey: targetItem.layerKey,
      sequenceIndex: 0,
      title: `${baseTitle} (Part ${idx}/${parts})`,
      description: targetItem.description,
      notes: targetItem.notes,
      durationDays: targetItem.durationDays,
      metadata: metadataCopy,
      targetLayerKeys: targetItem.targetLayerKeys
        ? [...targetItem.targetLayerKeys]
        : undefined,
      splitGroupId,
      splitIndex: idx,
      splitTotal: parts,
    }

    calendar.scheduledItems.push(newPart as ScheduledItemSubdocument)
    const createdPart = calendar.scheduledItems[
      calendar.scheduledItems.length - 1
    ] as ScheduledItemSubdocument
    layerItems.splice(
      targetIdx + idx - 1,
      0,
      createdPart as ScheduledItemSubdocument
    )
    previousDate = new Date(createdPart.date)
  }

  layerItems.forEach((item, index) => {
    item.sequenceIndex = index + 1
  })

  if (parts > 1) {
    for (let i = targetIdx + parts; i < layerItems.length; i += 1) {
      const item = layerItems[i]!
      const originalDate = originalDates.get(item._id)
      if (!originalDate) {
        continue
      }
      item.date = addValidSchoolDays(
        originalDate,
        parts - 1,
        includeWeekends,
        blockedDatesForLayer
      )
    }
  }

  calendar.markModified('scheduledItems')
  await calendar.save()
  return toCalendarDTO(calendar)
}

export async function unsplitScheduledItem(
  calendarId: string,
  payload: UnsplitScheduledItemInput
): Promise<CalendarDTO | null> {
  if (!Types.ObjectId.isValid(calendarId)) {
    return null
  }

  let calendar = await CalendarModel.findById(calendarId).exec()
  if (!calendar) {
    return null
  }

  let splitGroupId = payload.splitGroupId

  if (!splitGroupId) {
    const anchor = calendar.scheduledItems.find(
      (item: ScheduledItemSubdocument) => item._id === payload.scheduledItemId
    )
    if (!anchor?.splitGroupId) {
      return toCalendarDTO(calendar)
    }
    splitGroupId = anchor.splitGroupId
  }

  let groupParts = calendar.scheduledItems
    .filter((item: ScheduledItemSubdocument) => item.splitGroupId === splitGroupId)
    .sort(
      (a: ScheduledItemSubdocument, b: ScheduledItemSubdocument) =>
        (a.splitIndex ?? 0) - (b.splitIndex ?? 0)
    )

  if (groupParts.length < 2) {
    return toCalendarDTO(calendar)
  }

  const layerKey = groupParts[0]!.layerKey
  const gapDays = groupParts.length - 1

  if (gapDays > 0) {
    const lastPart = groupParts[groupParts.length - 1]!
    await shiftScheduledItems(calendarId, {
      scheduledItemId: lastPart._id,
      shiftByDays: -gapDays,
      layerKeys: [layerKey],
    })
    const refreshed = await CalendarModel.findById(calendarId).exec()
    if (!refreshed) {
      return null
    }
    calendar = refreshed
    groupParts = calendar.scheduledItems
      .filter((item: ScheduledItemSubdocument) => item.splitGroupId === splitGroupId)
      .sort(
        (a: ScheduledItemSubdocument, b: ScheduledItemSubdocument) =>
          (a.splitIndex ?? 0) - (b.splitIndex ?? 0)
      )
  }

  const [firstPart, ...restParts] = groupParts
  const baseTitle =
    firstPart!.title.replace(/\s+\(Part\s+\d+\/\d+\)$/i, '').trim() || firstPart!.title

  firstPart!.splitGroupId = undefined
  firstPart!.splitIndex = undefined
  firstPart!.splitTotal = undefined
  firstPart!.title = baseTitle

  if (restParts.length > 0) {
    const removalIds = new Set(restParts.map((item) => item._id))
    calendar.scheduledItems = calendar.scheduledItems.filter(
      (item: ScheduledItemSubdocument) => !removalIds.has(item._id)
    ) as typeof calendar.scheduledItems
  }

  calendar.markModified('scheduledItems')
  await calendar.save()
  return toCalendarDTO(calendar)
}

export async function createCalendar(
  payload: CreateCalendarInput
): Promise<CalendarDTO> {
  const includeWeekends = payload.includeWeekends ?? false
  const includeExceptions = payload.includeExceptions ?? false
  const startDate = payload.startDate ? new Date(payload.startDate) : null
  const normalizedLayers = normalizeLayers(payload.layers)
  const templateItemsByLayer = new Map(
    Object.entries(payload.templateItemsByLayer ?? {})
  )

  const layerKeySet = new Set(normalizedLayers.map(({ layer }) => layer.key))
  const standardLayerKeys = new Set(
    normalizedLayers
      .filter(({ layer }) => layer.kind !== 'exception')
      .map(({ layer }) => layer.key)
  )

  function ensureExceptionLayer(layerKey?: string): string {
    const desiredKey = layerKey ?? 'exceptions'
    if (!layerKeySet.has(desiredKey)) {
      normalizedLayers.push({
        layer: {
          key: desiredKey,
          name: 'Exceptions',
          color: '#f97316',
          description: 'Blocked/unavailable dates',
          autoShift: false,
          kind: 'exception',
          respectsGlobalExceptions: false,
        } as CalendarLayer,
        templateConfig: { mode: 'manual' as const },
      })
      layerKeySet.add(desiredKey)
    }
    return desiredKey
  }

  const exceptionSequences = new Map<string, number>()
  const initialExceptionItems: ScheduledItem[] = []
  const dedupeKeys = new Set<string>()

  for (const entry of payload.initialExceptions ?? []) {
    if (!entry?.date) continue
    const normalizedDate = normalizeDateInput(entry.date)
    const exceptionLayerKey = ensureExceptionLayer(entry.layerKey)
    const allowedTargets =
      entry.targetLayerKeys?.filter((key) => standardLayerKeys.has(key)) ?? []
    const scopeKey =
      allowedTargets.length > 0
        ? allowedTargets.slice().sort().join('|')
        : 'global'
    const dedupeKey = `${exceptionLayerKey}|${normalizedDate}|${scopeKey}`
    if (dedupeKeys.has(dedupeKey)) {
      continue
    }
    dedupeKeys.add(dedupeKey)

    const sequenceIndex = (exceptionSequences.get(exceptionLayerKey) ?? 0) + 1
    exceptionSequences.set(exceptionLayerKey, sequenceIndex)

    initialExceptionItems.push({
      _id: nanoid(),
      date: new Date(normalizedDate),
      layerKey: exceptionLayerKey,
      sequenceIndex,
      title: entry.title?.trim() || 'Exception',
      description: '',
      notes: '',
      durationDays: 1,
      metadata: {},
      targetLayerKeys: allowedTargets.length > 0 ? allowedTargets : undefined,
    })
  }

  const exceptionLayerKeys = new Set(
    normalizedLayers
      .filter(({ layer }) => layer.kind === 'exception' || layer.key === 'exceptions')
      .map(({ layer }) => layer.key)
  )

  const exceptionLookup =
    includeExceptions && initialExceptionItems.length > 0
      ? buildExceptionLookup({
          items: initialExceptionItems,
          exceptionLayerKeys,
        })
      : null

  const scheduledItemsFromLayers =
    startDate === null
      ? []
      : normalizedLayers.flatMap(({ layer, templateConfig }) => {
          if (layer.kind === 'exception' || templateConfig?.mode === 'manual') {
            return []
          }

          const itemCount =
            templateConfig?.itemCount ?? DEFAULT_TEMPLATE_ITEM_COUNT

          const blockedDates =
            includeExceptions && exceptionLookup
              ? getBlockedDatesForLayer(
                  layer.key,
                  exceptionLookup,
                  layer.respectsGlobalExceptions !== false
                )
              : undefined

          return generateScheduledItemsForLayer({
            layerKey: layer.key,
            layerName: layer.name,
            includeWeekends,
            startDate,
            itemCount,
            titlePattern: templateConfig?.titlePattern,
            templateItems: templateItemsByLayer.get(layer.key) ?? [],
            blockedDates,
          })
        })

  const scheduledItems = [...scheduledItemsFromLayers, ...initialExceptionItems]

  const calendar = await CalendarModel.create({
    name: payload.name,
    presetKey: payload.presetKey ?? payload.source ?? 'custom',
    startDate,
    includeWeekends,
    includeExceptions,
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

  const layerByKey = new Map(
    calendar.layers.map((layer: CalendarLayerSubdocument) => [layer.key, layer])
  )
  const exceptionLayerKeys = new Set(
    calendar.layers
      .filter((layer: CalendarLayerSubdocument) => layer.kind === 'exception')
      .map((layer) => layer.key)
  )
  const exceptionLookup = buildExceptionLookup({
    items: calendar.scheduledItems,
    exceptionLayerKeys,
  })
  const includeExceptions = calendar.includeExceptions

  // Calculate new date for target day (raw delta shift)
  const rawNewDate = addDays(targetItem.date, delta)

  // Validate and adjust target date to next valid school date if needed
  // This ensures the target day doesn't land on a weekend/holiday (unless weekends are included)
  const targetLayer = layerByKey.get(targetItem.layerKey)
  const targetBlockedDates =
    includeExceptions && targetLayer
      ? getBlockedDatesForLayer(
          targetItem.layerKey,
          exceptionLookup,
          targetLayer.respectsGlobalExceptions !== false
        )
      : includeExceptions
        ? exceptionLookup.global
        : undefined

  const newTargetDate = nextSchoolDate(
    rawNewDate,
    calendar.includeWeekends,
    targetBlockedDates
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
    const nextLayer = layerByKey.get(itemsToReflow[i + 1]!.layerKey)
    const blockedDatesForNext =
      includeExceptions && nextLayer
        ? getBlockedDatesForLayer(
            nextLayer.key,
            exceptionLookup,
            nextLayer.respectsGlobalExceptions !== false
          )
        : includeExceptions
          ? exceptionLookup.global
          : undefined
    const span = countValidDaySpan(
      current,
      next,
      calendar.includeWeekends,
      blockedDatesForNext
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
      const itemLayer = layerByKey.get(remainingItems[i]!.layerKey)
      const blockedDates =
        includeExceptions && itemLayer
          ? getBlockedDatesForLayer(
              itemLayer.key,
              exceptionLookup,
              itemLayer.respectsGlobalExceptions !== false
            )
          : includeExceptions
            ? exceptionLookup.global
            : undefined

      const nextDate = addValidSchoolDays(
        previousDate,
        span,
        calendar.includeWeekends,
        blockedDates
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
      if (!target) {
        if (!patch.name) {
          throw new Error(`Layer ${patch.key} requires a name when creating`)
        }
        const kind = patch.kind ?? 'standard'
        const newLayer: CalendarLayerSubdocument = {
          key: patch.key,
          name: patch.name,
          color: patch.color ?? '',
          description: patch.description ?? '',
          autoShift: resolveChainBehavior(
            patch.chainBehavior,
            patch.autoShift,
            kind
          ),
          kind,
        }
        calendar.layers.push(newLayer)
        byKey.set(newLayer.key, newLayer)
        modified = true
        continue
      }
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

