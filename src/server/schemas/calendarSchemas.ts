import { z } from 'zod'

export const groupingSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  color: z.string().optional(),
  description: z.string().optional(),
  autoShift: z.boolean().optional().default(true),
})

export const createCalendarSchema = z.object({
  name: z.string().min(1),
  source: z.enum(['abeka', 'custom']).optional().default('custom'),
  startDate: z.string().datetime(),
  totalDays: z.coerce.number().int().positive().optional().default(170),
  includeWeekends: z.boolean().optional().default(false),
  includeHolidays: z.boolean().optional().default(false),
  groupings: z.array(groupingSchema).optional(),
  eventsPerGrouping: z
    .record(
      z.array(
        z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          durationDays: z.number().int().positive().optional().default(1),
        })
      )
    )
    .optional(),
})

export type CreateCalendarInput = z.infer<typeof createCalendarSchema>

export const calendarIdParamsSchema = z.object({
  calendarId: z.string().min(1),
})

export type CalendarIdParams = z.infer<typeof calendarIdParamsSchema>

export const shiftCalendarDaysSchema = z.object({
  dayId: z.string().min(1),
  shiftByDays: z.number().int(),
  groupingKeys: z.array(z.string().min(1)).optional(),
})

export type ShiftCalendarDaysInput = z.infer<typeof shiftCalendarDaysSchema>

