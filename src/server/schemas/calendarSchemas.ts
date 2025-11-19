import { z } from 'zod'

const chainBehaviorEnum = z.enum(['linked', 'independent'])
const layerKindEnum = z.enum(['standard', 'exception'])
const templateModeEnum = z.enum(['generated', 'manual'])

export const layerTemplateSchema = z.object({
  mode: templateModeEnum.optional().default('generated'),
  itemCount: z.coerce.number().int().positive().optional(),
  titlePattern: z.string().optional(),
})

export const layerSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  color: z.string().optional(),
  description: z.string().optional(),
  chainBehavior: chainBehaviorEnum.optional(),
  autoShift: z.boolean().optional(), // legacy compatibility
  kind: layerKindEnum.optional().default('standard'),
  respectsGlobalExceptions: z.boolean().optional(),
  // Optional event title pattern used during generation, supports "{n}" placeholder.
  titlePattern: z.string().optional(),
  templateConfig: layerTemplateSchema.optional(),
})

export type LayerInput = z.infer<typeof layerSchema>

const exceptionEntrySchema = z.object({
  date: z.string().min(1),
  title: z.string().optional(),
  targetLayerKeys: z.array(z.string().min(1)).optional(),
})

const initialExceptionEntrySchema = exceptionEntrySchema.extend({
  layerKey: z.string().optional(),
})

export const addScheduledItemSchema = z.object({
  layerKey: z.string().min(1),
  date: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  notes: z.string().optional(),
  durationDays: z.coerce.number().int().min(1).optional(),
})

export type AddScheduledItemInput = z.infer<typeof addScheduledItemSchema>

export const createCalendarSchema = z.object({
  name: z.string().min(1),
  presetKey: z.string().optional(),
  source: z.string().optional(), // legacy alias
  startDate: z.string().datetime().optional(),
  includeWeekends: z.boolean().optional().default(false),
  includeExceptions: z.boolean().optional().default(false),
  layers: z.array(layerSchema).optional(),
  templateItemsByLayer: z
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
  initialExceptions: z.array(initialExceptionEntrySchema).optional(),
})

export type CreateCalendarInput = z.infer<typeof createCalendarSchema>

export const calendarIdParamsSchema = z.object({
  calendarId: z.string().min(1),
})

export type CalendarIdParams = z.infer<typeof calendarIdParamsSchema>

export const shiftScheduledItemsSchema = z
  .object({
    scheduledItemId: z.string().min(1).optional(),
    dayId: z.string().min(1).optional(), // legacy compatibility
    shiftByDays: z.number().int(),
    layerKeys: z.array(z.string().min(1)).optional(),
  })
  .refine(
    (value) => Boolean(value.scheduledItemId ?? value.dayId),
    'scheduledItemId is required'
  )

export type ShiftScheduledItemsInput = z.infer<
  typeof shiftScheduledItemsSchema
>

// Partial update schema for calendar settings (currently layer metadata)
export const updateCalendarSchema = z.object({
  layers: z
    .array(
      z.object({
        key: z.string().min(1),
        name: z.string().optional(),
        color: z.string().optional(),
        description: z.string().optional(),
        chainBehavior: chainBehaviorEnum.optional(),
        autoShift: z.boolean().optional(),
        kind: layerKindEnum.optional(),
        respectsGlobalExceptions: z.boolean().optional(),
      })
    )
    .optional(),
  includeWeekends: z.boolean().optional(),
  includeExceptions: z.boolean().optional(),
})

export type UpdateCalendarInput = z.infer<typeof updateCalendarSchema>

// Exceptions CRUD payload
export const updateExceptionsSchema = z.object({
  addEntries: z.array(exceptionEntrySchema).optional().default([]),
  removeDates: z.array(z.string().min(1)).optional().default([]),
  removeEntryIds: z.array(z.string().min(1)).optional().default([]),
  layerKey: z.string().optional().default('exceptions'),
})

export type UpdateExceptionsInput = z.input<typeof updateExceptionsSchema>

export const splitScheduledItemSchema = z.object({
  scheduledItemId: z.string().min(1),
  parts: z.coerce.number().int().min(2).max(6).optional().default(2),
})

export type SplitScheduledItemInput = z.infer<typeof splitScheduledItemSchema>

export const unsplitScheduledItemSchema = z
  .object({
    scheduledItemId: z.string().min(1).optional(),
    splitGroupId: z.string().min(1).optional(),
  })
  .refine(
    (value) => Boolean(value.scheduledItemId ?? value.splitGroupId),
    'scheduledItemId or splitGroupId is required'
  )

export type UnsplitScheduledItemInput = z.infer<typeof unsplitScheduledItemSchema>

