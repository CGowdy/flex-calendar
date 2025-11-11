import { Types } from 'mongoose'

import {
  CalendarModel,
  type Calendar,
  type CalendarDocument,
  type CalendarDay,
  type CalendarEvent,
  type CalendarGrouping,
} from '../models/calendarModel.js'
import type {
  CalendarDTO,
  CalendarDayDTO,
  CalendarEventDTO,
  CalendarGroupingDTO,
  CalendarSummaryDTO,
} from '../types/calendar.js'
import type {
  CreateCalendarInput,
  ShiftCalendarDaysInput,
  UpdateCalendarInput,
} from '../schemas/calendarSchemas.js'
import { addDays, nextSchoolDate } from '../utils/dateUtils.js'
import { nanoid } from '../utils/id.js'

type CalendarDaySubdocument = CalendarDocument['days'][number]
type CalendarGroupingSubdocument = CalendarDocument['groupings'][number]

const DEFAULT_GROUPINGS: CalendarGrouping[] = [
  {
    key: 'abeka',
    name: 'Abeka',
    color: '#2563eb',
    description: '',
    autoShift: true,
  },
]

function toGroupingDTO(grouping: CalendarGrouping): CalendarGroupingDTO {
  return {
    key: grouping.key,
    name: grouping.name,
    color: grouping.color ?? '',
    description: grouping.description ?? '',
    autoShift: grouping.autoShift ?? true,
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

function toDayDTO(day: CalendarDay): CalendarDayDTO {
  const enrichedDay = day as CalendarDay & { id?: string }
  return {
    id: enrichedDay.id ?? enrichedDay._id,
    date: new Date(enrichedDay.date),
    groupingKey: enrichedDay.groupingKey,
    groupingSequence: enrichedDay.groupingSequence,
    label: enrichedDay.label,
    notes: enrichedDay.notes ?? '',
    events: Array.isArray(enrichedDay.events)
      ? enrichedDay.events.map((event) => toEventDTO(event))
      : [],
  }
}

function toCalendarDTO(calendar: CalendarDocument): CalendarDTO {
  const json = calendar.toJSON() as unknown as Calendar & { id: string }

  return {
    id: json.id,
    name: json.name,
    source: json.source,
    startDate: new Date(json.startDate),
    totalDays: json.totalDays,
    includeWeekends: json.includeWeekends,
    includeHolidays: json.includeHolidays,
    groupings: (json.groupings ?? []).map((grouping) => toGroupingDTO(grouping)),
    days: (json.days ?? []).map((day) => toDayDTO(day)),
  }
}

function toCalendarSummary(calendar: CalendarDocument): CalendarSummaryDTO {
  const dto = toCalendarDTO(calendar)
  return {
    id: dto.id,
    name: dto.name,
    startDate: dto.startDate,
    totalDays: dto.totalDays,
    groupings: dto.groupings,
  }
}

function normalizeGroupings(
  groupings: CreateCalendarInput['groupings']
): CalendarGrouping[] {
  if (!groupings || groupings.length === 0) {
    return DEFAULT_GROUPINGS
  }

  return groupings.map<CalendarGrouping>((grouping) => ({
    key: grouping.key,
    name: grouping.name,
    color: grouping.color ?? '',
    description: grouping.description ?? '',
    autoShift: grouping.autoShift ?? true,
  }))
}

interface GenerateDaysParams {
  groupingKey: string
  groupingName: string
  totalDays: number
  startDate: Date
  includeWeekends: boolean
  titlePattern?: string
  eventsForGrouping: Array<{
    title: string
    description?: string
    durationDays?: number
  }>
}

function generateDaysForGrouping({
  groupingKey,
  groupingName,
  totalDays,
  startDate,
  includeWeekends,
  titlePattern,
  eventsForGrouping,
}: GenerateDaysParams): CalendarDay[] {
  const days: CalendarDay[] = []
  let cursor = new Date(startDate)

  for (let index = 0; index < totalDays; index += 1) {
    const schoolDate = nextSchoolDate(cursor, includeWeekends)
    const groupingSequence = index + 1

    const templateEvent = eventsForGrouping[groupingSequence - 1]
    const computedTitle =
      templateEvent?.title ??
      (titlePattern && titlePattern.includes('{n}')
        ? titlePattern.replace('{n}', String(groupingSequence))
        : `${groupingName} Lesson ${groupingSequence}`)
    const events: CalendarEvent[] = [
      {
        _id: nanoid(),
        title: computedTitle,
        description: templateEvent?.description ?? '',
        durationDays: templateEvent?.durationDays ?? 1,
        metadata: {},
      },
    ]

    days.push({
      _id: nanoid(),
      date: schoolDate,
      groupingKey,
      groupingSequence,
      label: `Day ${groupingSequence}`,
      notes: '',
      events,
    })

    cursor = addDays(schoolDate, 1)
  }

  return days
}

export async function listCalendars(): Promise<CalendarSummaryDTO[]> {
  const calendars = await CalendarModel.find()
    .select(['name', 'startDate', 'totalDays', 'groupings'])
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
  const totalDays = payload.totalDays ?? 170
  const includeWeekends = payload.includeWeekends ?? false
  const groupings = normalizeGroupings(payload.groupings)
  const startDate = new Date(payload.startDate)

  const groupingPatternByKey = new Map<string, string | undefined>(
    (payload.groupings ?? []).map((g) => [g.key, g.titlePattern])
  )

  const days = groupings.flatMap((grouping) =>
    generateDaysForGrouping({
      groupingKey: grouping.key,
      groupingName: grouping.name,
      includeWeekends,
      startDate,
      totalDays,
      titlePattern: groupingPatternByKey.get(grouping.key),
      eventsForGrouping: payload.eventsPerGrouping?.[grouping.key] ?? [],
    })
  )

  const calendar = await CalendarModel.create({
    name: payload.name,
    source: payload.source ?? 'custom',
    startDate,
    totalDays,
    includeWeekends,
    includeHolidays: payload.includeHolidays ?? false,
    groupings,
    days,
  })

  return toCalendarDTO(calendar)
}

export async function shiftCalendarDays(
  calendarId: string,
  payload: ShiftCalendarDaysInput
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

  const targetDay = calendar.days.find(
    (day: CalendarDaySubdocument) => day._id === payload.dayId
  )
  if (!targetDay) {
    return null
  }

  const groupingKeys =
    payload.groupingKeys && payload.groupingKeys.length > 0
      ? payload.groupingKeys
      : calendar.groupings
          .filter(
            (grouping: CalendarGroupingSubdocument) => grouping.autoShift
          )
          .map((grouping: CalendarGroupingSubdocument) => grouping.key)

  const startingSequence = targetDay.groupingSequence

  calendar.days.forEach((day: CalendarDaySubdocument) => {
    if (
      groupingKeys.includes(day.groupingKey) &&
      day.groupingSequence >= startingSequence
    ) {
      day.date = addDays(day.date, delta)
    }
  })

  calendar.markModified('days')
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

  if (payload.groupings && payload.groupings.length > 0) {
    const byKey = new Map(calendar.groupings.map((g) => [g.key, g]))
    for (const patch of payload.groupings) {
      const target = byKey.get(patch.key)
      if (!target) continue
      if (typeof patch.name === 'string') target.name = patch.name
      if (typeof patch.color === 'string') target.color = patch.color
      if (typeof patch.description === 'string') target.description = patch.description
      if (typeof patch.autoShift === 'boolean') target.autoShift = patch.autoShift
      modified = true
    }
  }

  if (typeof payload.includeWeekends === 'boolean') {
    calendar.includeWeekends = payload.includeWeekends
    modified = true
  }
  if (typeof payload.includeHolidays === 'boolean') {
    calendar.includeHolidays = payload.includeHolidays
    modified = true
  }

  if (modified) {
    calendar.markModified('groupings')
    await calendar.save()
  }

  return toCalendarDTO(calendar)
}

