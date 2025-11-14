import mongoose, { Schema } from 'mongoose'
import type { HydratedDocument, Model } from 'mongoose'
import { nanoid } from '../utils/id.js'

export interface CalendarEvent {
  _id: string
  // Optional client-facing id used after toJSON normalization
  id?: string
  title: string
  description: string
  durationDays: number
  metadata: Record<string, unknown>
}

const CalendarEventSchema = new Schema<CalendarEvent>(
  {
    _id: {
      type: String,
      default: () => nanoid(),
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    durationDays: {
      type: Number,
      default: 1,
      min: 1,
    },
    metadata: {
      type: Schema.Types.Mixed as Schema['obj']['metadata'],
      default: () => ({}),
    } as unknown as CalendarEvent['metadata'],
  },
  {
    _id: false,
    timestamps: false,
  }
)

export interface ScheduledItem {
  _id: string
  date: Date
  layerKey: string
  sequenceIndex: number
  label: string
  notes: string
  events: CalendarEvent[]
}

const ScheduledItemSchema = new Schema<ScheduledItem>(
  {
    _id: {
      type: String,
      default: () => nanoid(),
    },
    date: {
      type: Date,
      required: true,
    },
    layerKey: {
      type: String,
      required: true,
      alias: 'groupingKey',
    },
    sequenceIndex: {
      type: Number,
      required: true,
      min: 1,
      alias: 'groupingSequence',
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    events: {
      type: [CalendarEventSchema],
      default: () => [],
    },
  },
  {
    _id: false,
    timestamps: false,
  }
)

export interface CalendarLayer {
  key: string
  name: string
  color: string
  autoShift: boolean
  description: string
  kind?: 'standard' | 'exception'
}

const CalendarLayerSchema = new Schema<CalendarLayer>(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      default: '',
      trim: true,
    },
    autoShift: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    kind: {
      type: String,
      enum: ['standard', 'exception'],
      default: 'standard',
    },
  },
  {
    _id: false,
    timestamps: false,
  }
)

export interface Calendar {
  name: string
  presetKey?: string
  source?: 'abeka' | 'custom' // legacy alias
  startDate: Date
  totalDays: number
  includeWeekends: boolean
  includeHolidays?: boolean // legacy alias
  includeExceptions: boolean
  layers: CalendarLayer[]
  scheduledItems: ScheduledItem[]
}

const CalendarSchema = new Schema<Calendar>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    presetKey: {
      type: String,
      default: '',
      alias: 'source',
    },
    startDate: {
      type: Date,
      required: true,
    },
    totalDays: {
      type: Number,
      default: 170,
      min: 1,
    },
    includeWeekends: {
      type: Boolean,
      default: false,
    },
    includeExceptions: {
      type: Boolean,
      default: false,
      alias: 'includeHolidays',
    },
    layers: {
      type: [CalendarLayerSchema],
      default: () => [],
      alias: 'groupings',
    },
    scheduledItems: {
      type: [ScheduledItemSchema],
      default: () => [],
      alias: 'days',
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
)

CalendarSchema.index({ name: 1 }, { unique: false })

type ScheduledItemWithInternalIds = ScheduledItem & {
  _id?: string
  id?: string
  events?: Array<CalendarEvent & { _id?: string; id?: string }>
}

CalendarSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const calendarRet = (ret as unknown) as Record<string, unknown> & {
      _id?: string
      id?: string
      scheduledItems?: ScheduledItemWithInternalIds[]
    }

    if (calendarRet._id) {
      calendarRet.id = calendarRet._id.toString()
      delete calendarRet._id
    }

    if (Array.isArray(calendarRet.scheduledItems)) {
      calendarRet.scheduledItems = calendarRet.scheduledItems.map((item) => {
        const normalizedEvents = Array.isArray(item.events)
          ? item.events.map((event) => ({
              ...((event as unknown) as Record<string, unknown>),
              id: (event as CalendarEvent).id ?? (event as CalendarEvent)._id ?? nanoid(),
              _id: undefined,
            }))
          : []

        return {
          ...((item as unknown) as Record<string, unknown>),
          id:
            (item as ScheduledItemWithInternalIds).id ??
            (item as ScheduledItemWithInternalIds)._id ??
            nanoid(),
          _id: undefined,
          events: normalizedEvents as unknown as CalendarEvent[],
        } as unknown as ScheduledItemWithInternalIds
      })
    }

    if (!calendarRet.scheduledItems && Array.isArray(calendarRet.days)) {
      calendarRet.scheduledItems = calendarRet.days
    }

    return calendarRet
  },
})

export type CalendarDocument = HydratedDocument<Calendar>

export const CalendarModel =
  (mongoose.models.Calendar as Model<Calendar> | undefined) ??
  mongoose.model<Calendar>('Calendar', CalendarSchema)

