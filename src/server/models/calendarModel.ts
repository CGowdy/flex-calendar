import mongoose, { Schema } from 'mongoose'
import type { HydratedDocument, Model } from 'mongoose'
import { nanoid } from '../utils/id.js'

export interface CalendarEvent {
  _id: string
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

export interface CalendarDay {
  _id: string
  date: Date
  groupingKey: string
  groupingSequence: number
  label: string
  notes: string
  events: CalendarEvent[]
}

const CalendarDaySchema = new Schema<CalendarDay>(
  {
    _id: {
      type: String,
      default: () => nanoid(),
    },
    date: {
      type: Date,
      required: true,
    },
    groupingKey: {
      type: String,
      required: true,
    },
    groupingSequence: {
      type: Number,
      required: true,
      min: 1,
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

export interface CalendarGrouping {
  key: string
  name: string
  color: string
  autoShift: boolean
  description: string
}

const CalendarGroupingSchema = new Schema<CalendarGrouping>(
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
  },
  {
    _id: false,
    timestamps: false,
  }
)

export interface Calendar {
  name: string
  source: 'abeka' | 'custom'
  startDate: Date
  totalDays: number
  includeWeekends: boolean
  includeHolidays: boolean
  groupings: CalendarGrouping[]
  days: CalendarDay[]
}

const CalendarSchema = new Schema<Calendar>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      enum: ['abeka', 'custom'],
      default: 'custom',
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
    includeHolidays: {
      type: Boolean,
      default: false,
    },
    groupings: {
      type: [CalendarGroupingSchema],
      default: () => [],
    },
    days: {
      type: [CalendarDaySchema],
      default: () => [],
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
)

CalendarSchema.index({ name: 1 }, { unique: false })

type CalendarDayWithInternalIds = CalendarDay & {
  _id?: string
  id?: string
  events?: Array<CalendarEvent & { _id?: string; id?: string }>
}

CalendarSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const calendarRet = ret as Record<string, unknown> & {
      _id?: string
      id?: string
      days?: CalendarDayWithInternalIds[]
    }

    if (calendarRet._id) {
      calendarRet.id = calendarRet._id.toString()
      delete calendarRet._id
    }

    if (Array.isArray(calendarRet.days)) {
      calendarRet.days = calendarRet.days.map((day) => {
        const normalizedEvents = Array.isArray(day.events)
          ? day.events.map((event) => ({
              ...event,
              id: event.id ?? event._id ?? nanoid(),
              _id: undefined,
            }))
          : []

        return {
          ...day,
          id: day.id ?? day._id ?? nanoid(),
          _id: undefined,
          events: normalizedEvents,
        }
      })
    }

    return calendarRet
  },
})

export type CalendarDocument = HydratedDocument<Calendar>

export const CalendarModel =
  (mongoose.models.Calendar as Model<Calendar> | undefined) ??
  mongoose.model<Calendar>('Calendar', CalendarSchema)

