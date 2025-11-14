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
import {
  addDays,
  addValidSchoolDays,
  countValidDaySpan,
  generateValidSchoolDates,
  getHolidayDates,
  nextSchoolDate,
} from '../utils/dateUtils.js'
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
  holidayDates,
}: GenerateDaysParams & { holidayDates?: Set<string> }): CalendarDay[] {
  const days: CalendarDay[] = []

  // Generate all valid school dates upfront
  const validDates = generateValidSchoolDates(
    startDate,
    totalDays,
    includeWeekends,
    holidayDates
  )

  for (let index = 0; index < totalDays; index += 1) {
    const schoolDate = validDates[index]!
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

  // Generate holidays grouping first (if selected) to get holiday dates
  const holidaysGrouping = groupings.find((g) => g.key === 'holidays')
  const holidayDays: CalendarDay[] = []
  if (holidaysGrouping) {
    // For now, holidays grouping is created but empty - user will add holidays later
    // This allows us to get the holiday dates set (empty initially)
  }

  // Get holiday dates from any pre-existing holiday days
  // (For initial creation, this will be empty, but structure supports future holiday import)
  const holidayDates = getHolidayDates(holidayDays)

  // Generate days for non-holiday groupings, excluding holiday dates
  const nonHolidayGroupings = groupings.filter((g) => g.key !== 'holidays')
  const days = nonHolidayGroupings.flatMap((grouping) =>
    generateDaysForGrouping({
      groupingKey: grouping.key,
      groupingName: grouping.name,
      includeWeekends,
      startDate,
      totalDays,
      titlePattern: groupingPatternByKey.get(grouping.key),
      eventsForGrouping: payload.eventsPerGrouping?.[grouping.key] ?? [],
      holidayDates,
    })
  )

  // Add holiday days (empty for now, but structure supports future additions)
  const allDays = [...days, ...holidayDays]

  const calendar = await CalendarModel.create({
    name: payload.name,
    source: payload.source ?? 'custom',
    startDate,
    totalDays,
    includeWeekends,
    includeHolidays: payload.includeHolidays ?? false,
    groupings,
    days: allDays,
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

  // Get holiday dates for exclusion
  const holidayDates = getHolidayDates(calendar.days)

  // Calculate new date for target day (raw delta shift)
  const rawNewDate = addDays(targetDay.date, delta)

  // Validate and adjust target date to next valid school date if needed
  // This ensures the target day doesn't land on a weekend/holiday (unless weekends are included)
  const newTargetDate = nextSchoolDate(
    rawNewDate,
    calendar.includeWeekends,
    holidayDates
  )

  // Find the starting sequence for reflow
  const startingSequence = targetDay.groupingSequence

  // Get all days that need to be reflowed, sorted by sequence
  const daysToReflow = calendar.days
    .filter(
      (day: CalendarDaySubdocument) =>
        groupingKeys.includes(day.groupingKey) &&
        day.groupingSequence >= startingSequence
    )
    .sort(
      (a: CalendarDaySubdocument, b: CalendarDaySubdocument) =>
        a.groupingSequence - b.groupingSequence
    )

  if (daysToReflow.length === 0) {
    // No days to reflow, just update target day
    targetDay.date = newTargetDate
    calendar.markModified('days')
    await calendar.save()
    return toCalendarDTO(calendar)
  }

  // Ensure target day is first (sequence ties)
  const targetIndex = daysToReflow.findIndex(
    (day: CalendarDaySubdocument) => day._id === targetDay._id
  )
  if (targetIndex === -1) {
    targetDay.date = newTargetDate
    calendar.markModified('days')
    await calendar.save()
    return toCalendarDTO(calendar)
  }
  if (targetIndex > 0) {
    const [targetInList] = daysToReflow.splice(targetIndex, 1)
    if (targetInList) {
      daysToReflow.unshift(targetInList)
    }
  }

  // Capture valid-day gaps between consecutive days
  const gapSpans: number[] = []
  for (let i = 0; i < daysToReflow.length - 1; i++) {
    const current = new Date(daysToReflow[i]!.date)
    const next = new Date(daysToReflow[i + 1]!.date)
    const span = countValidDaySpan(
      current,
      next,
      calendar.includeWeekends,
      holidayDates
    )
    gapSpans.push(span > 0 ? span : 1)
  }

  // Set the target day's new date (it's the first in the reflow list)
  const firstDay = daysToReflow[0]!
  firstDay.date = newTargetDate

  // Generate valid dates for remaining days starting from day after target
  const remainingDays = daysToReflow.slice(1)

  if (remainingDays.length > 0) {
    let previousDate = newTargetDate
    for (let i = 0; i < remainingDays.length; i++) {
      const span = gapSpans[i] ?? 1
      const nextDate = addValidSchoolDays(
        previousDate,
        span,
        calendar.includeWeekends,
        holidayDates
      )
      remainingDays[i]!.date = nextDate
      previousDate = nextDate
    }
  }

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

