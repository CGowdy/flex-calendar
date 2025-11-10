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
  eventsForGrouping,
}: GenerateDaysParams): CalendarDay[] {
  const days: CalendarDay[] = []
  let cursor = new Date(startDate)

  for (let index = 0; index < totalDays; index += 1) {
    const schoolDate = nextSchoolDate(cursor, includeWeekends)
    const groupingSequence = index + 1

    const templateEvent = eventsForGrouping[groupingSequence - 1]
    const events: CalendarEvent[] = [
      {
        _id: nanoid(),
        title:
          templateEvent?.title ?? `${groupingName} Lesson ${groupingSequence}`,
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

  const days = groupings.flatMap((grouping) =>
    generateDaysForGrouping({
      groupingKey: grouping.key,
      groupingName: grouping.name,
      includeWeekends,
      startDate,
      totalDays,
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

