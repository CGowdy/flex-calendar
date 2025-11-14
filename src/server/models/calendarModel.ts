import mongoose, { Schema } from 'mongoose'
import type { HydratedDocument, Model } from 'mongoose'
import { nanoid } from '../utils/id.js'

export interface ScheduledItem {
  _id: string
  date: Date
  layerKey: string
  sequenceIndex: number
  title: string
  description: string
  notes: string
  durationDays: number
  metadata: Record<string, unknown>
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
    notes: {
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
    } as unknown as ScheduledItem['metadata'],
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
  startDate?: Date | null
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
      required: false,
      default: null,
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
      calendarRet.scheduledItems = calendarRet.scheduledItems.map((item) => ({
        ...((item as unknown) as Record<string, unknown>),
        id: (item as { id?: string; _id?: string }).id ??
          (item as { _id?: string })._id ??
          nanoid(),
        _id: undefined,
      }))
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

