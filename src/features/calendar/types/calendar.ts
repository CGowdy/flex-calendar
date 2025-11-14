/**
 * Core domain model for Flex Calendar.
 *
 * Mental model:
 * - A **Calendar** is a top-level container (e.g. “2025–2026 School Year”, “Q1 Content Plan”).
 * - Each calendar has one or more **CalendarLayer**s. A layer is a track inside that calendar
 *   (e.g. “Mercy”, “Grace”, “Holidays”, “Workouts”).
 * - A **CalendarEvent** is the actual thing that appears on the calendar grid for a given date
 *   in a specific layer. This is what maps most directly to a Google Calendar “event”.
 *
 * Important for future work / AI tools:
 * - Do NOT collapse Calendar and CalendarLayer. A Calendar holds many layers.
 * - Treat CalendarEvent as the *only* scheduled unit on the calendar (no nested events).
 * - All chaining / shifting logic operates on CalendarEvent[] within a single Calendar.
 */

export type ChainBehavior =
  /**
   * 'linked' = events in this layer are part of a chain.
   * Moving one CalendarEvent may cause other events in the same layer (and optionally other
   * layers) to shift according to the scheduling rules.
   */
  | 'linked'
  /**
   * 'independent' = events in this layer do NOT auto-shift when one is moved.
   * Moving a CalendarEvent only affects that one event.
   */
  | 'independent'

/**
 * LayerKind describes how the scheduling engine should treat this layer.
 *
 * - 'standard'  = normal timeline items (plans, tasks, lessons, workouts, etc.)
 * - 'exception' = dates that should usually be treated as exceptions/blackouts
 *                 (e.g. holidays, sick days). These can be used as "do not schedule here"
 *                 when generating or shifting events in standard layers.
 */
export type LayerKind = 'standard' | 'exception'

/**
 * How items for a layer are initially created.
 *
 * - 'generated' = the system will generate a sequence of events based on a count + pattern.
 * - 'manual'    = events will be added manually by the user over time.
 */
export type LayerTemplateMode = 'generated' | 'manual'

/**
 * CalendarEvent is the atomic scheduled thing in the system.
 *
 * It represents “something scheduled on a specific date in a specific layer” and is what
 * gets rendered on the calendar grid and exported to external calendars (e.g. Google).
 *
 * Examples:
 * - “Math – Lesson 42”
 * - “Record video A”
 * - “Workout – Upper body”
 */
export interface CalendarEvent {
  /** Unique identifier for this event. */
  id: string

  /** The calendar date this event appears on (ISO date: YYYY-MM-DD). */
  date: string

  /**
   * Key of the CalendarLayer this event belongs to.
   * This must match one of the `layers[].key` inside the parent Calendar.
   */
  layerKey: string

  /**
   * Position within a logical sequence for the layer (0-based).
   * Used for chain ordering and comparisons (“Day 12 of this plan”, etc.).
   */
  sequenceIndex: number

  /** Short title rendered in the calendar UI and used for exports. */
  title: string

  /** Optional longer description (rich notes, details, etc.). */
  description?: string

  /** Optional free-form notes (quick annotations, scratch info, etc.). */
  notes?: string

  /**
   * Number of consecutive days this event spans.
   * Usually 1. Can be used later to support multi-day events.
   */
  durationDays?: number

  /** Arbitrary metadata for domain-specific needs (tags, subject codes, etc.). */
  metadata?: Record<string, unknown>
}

/**
 * Backwards compatibility alias.
 *
 * NOTE:
 * - The system used to call these "ScheduledItem".
 * - Prefer using CalendarEvent in new code.
 */
export type ScheduledItem = CalendarEvent

/**
 * CalendarLayer is a track inside a Calendar.
 *
 * Examples:
 * - Per-person layers: “Mercy”, “Grace”
 * - Plan vs actual: “Planned”, “Actual”
 * - Exception track: “Holidays”, “Blackout dates”
 *
 * The sidebar list in the UI corresponds to the layers for the currently selected Calendar.
 */
export interface CalendarLayer {
  /**
   * Unique key within a Calendar. Used by CalendarEvent.layerKey to associate events
   * with this layer.
   */
  key: string

  /** Display name of the layer shown in the UI. */
  name: string

  /** Color used for this layer’s events in the calendar UI. */
  color: string

  /** Optional description, shown in settings/tooltips. */
  description: string

  /**
   * How events in this layer behave when one is moved.
   * - 'linked'      = events participate in chain behavior.
   * - 'independent' = moving one event does not auto-shift others.
   */
  chainBehavior: ChainBehavior

  /**
   * Whether this is a normal layer ('standard') or an exception layer ('exception').
   * Exception layers are typically used to store holidays, sick days, etc.
   */
  kind: LayerKind
}

/**
 * Calendar is the top-level container (plan/project/year).
 *
 * Examples:
 * - “2025–2026 School Year”
 * - “Q1 Content Plan”
 * - “12-Week Strength Program”
 *
 * Each Calendar:
 * - Has its own rules (e.g. includeWeekends/includeExceptions).
 * - Contains one or more CalendarLayer tracks.
 * - Owns the CalendarEvent[] for those layers.
 */
export interface Calendar {
  /** Unique identifier for the calendar. */
  id: string

  /** Human-readable name of this calendar/plan. */
  name: string

  /**
   * Optional preset key describing how this calendar was created
   * (e.g. a homeschool preset, workout template, etc.).
   * Used for future preset/application logic; not required for core behavior.
   */
  presetKey?: string

  /**
   * Optional start date for this calendar (ISO date).
   * Used as a base when generating initial event sequences.
   */
  startDate: string | null

  /**
   * Whether generated/shifted events for standard layers are allowed to land
   * on weekends by default.
   */
  includeWeekends: boolean

  /**
   * Whether generated/shifted events should respect exception layers
   * (e.g. skip holidays/sick days).
   */
  includeExceptions: boolean

  /**
   * Layers (tracks) belonging to this calendar.
   * The sidebar “Layers” list maps to this array for the selected calendar.
   */
  layers: CalendarLayer[]

  /**
   * All events for this calendar across all layers.
   * Filtering by layerKey gives you the events for a specific layer.
   */
  scheduledItems: CalendarEvent[]
}

/**
 * Lightweight representation of a Calendar for list views / dropdowns.
 */
export type CalendarSummary = Pick<
  Calendar,
  'id' | 'name' | 'startDate' | 'layers'
>

/**
 * Configuration for how a layer's initial events are generated.
 *
 * This is used at calendar creation time and is NOT a persisted template type.
 * Once a calendar is created, only CalendarEvent[] are stored.
 */
export interface LayerTemplateConfig {
  /** 'generated' = create events automatically, 'manual' = user will add events later. */
  mode: LayerTemplateMode

  /** Number of events to generate for this layer (if mode === 'generated'). */
  itemCount?: number

  /**
   * Pattern used to generate titles for the events (e.g. "Day {n}").
   * Implementation can decide how to substitute {n}.
   */
  titlePattern?: string
}

/**
 * Input for creating a layer as part of calendar creation.
 */
export interface CreateCalendarLayerInput {
  /** Key that will be stored as CalendarLayer.key and referenced by CalendarEvent.layerKey. */
  key: string

  /** Display name of the layer. */
  name: string

  /** Optional color override (implementation may choose a default if not provided). */
  color?: string

  /** Optional description for this layer. */
  description?: string

  /** Optional chain behavior; defaults should be handled server-side if omitted. */
  chainBehavior?: ChainBehavior

  /** Optional layer kind; defaults to 'standard' if omitted. */
  kind?: LayerKind

  /** Optional template generation config used at creation time. */
  templateConfig?: LayerTemplateConfig
}

/**
 * Request payload for creating a new Calendar.
 *
 * Notes:
 * - `layers` defines the layers to create.
 * - `templateItemsByLayer` optionally defines initial events to generate per layer.
 *   These are converted into CalendarEvent[] by the server at creation time.
 */
export interface CreateCalendarRequest {
  /** Name of the new calendar. */
  name: string

  /** Optional preset identifier used to apply default config. */
  presetKey?: string

  /** Optional start date for the calendar (ISO date). */
  startDate?: string | null

  /** See Calendar.includeWeekends. */
  includeWeekends?: boolean

  /** See Calendar.includeExceptions. */
  includeExceptions?: boolean

  /** Layers to create within this calendar. */
  layers?: CreateCalendarLayerInput[]

  /**
   * Optional per-layer template items for initial population.
   * Key must match the layer key.
   */
  templateItemsByLayer?: Record<
    string,
    Array<{
      title: string
      description?: string
      durationDays?: number
    }>
  >
}

/**
 * Request payload for shifting events in a calendar.
 *
 * - `scheduledItemId` is the anchor event being moved.
 * - `shiftByDays` is the delta (positive or negative).
 * - `layerKeys` optionally restricts which layers participate in the shift.
 *   If omitted, the implementation may decide based on chainBehavior and other rules.
 */
export interface ShiftScheduledItemsRequest {
  scheduledItemId: string
  shiftByDays: number
  layerKeys?: string[]
}

/**
 * Partial update for calendar configuration and layers.
 *
 * NOTE:
 * - This does NOT directly modify CalendarEvent[]; those changes are handled via specific
 *   scheduling endpoints (e.g. shift operations, add/remove events).
 */
export interface UpdateCalendarRequest {
  /** Updates to existing layers, keyed by `key`. */
  layers?: Array<{
    key: string
    name?: string
    color?: string
    description?: string
    chainBehavior?: ChainBehavior
    kind?: LayerKind
  }>

  /** See Calendar.includeWeekends. */
  includeWeekends?: boolean

  /** See Calendar.includeExceptions. */
  includeExceptions?: boolean
}
