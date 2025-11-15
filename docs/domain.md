# Flex Calendar – Domain Model

Flex Calendar is a **chainable calendar** system.

At a high level:

- A **Calendar** is a top-level plan/context (e.g. “2025–2026 School Year”, “Q1 Content Plan”, “12‑Week Fitness Block”).
- Each calendar has one or more **Layers** (tracks), such as:
  - people (Mercy, Grace, Nehemiah),
  - categories (Math Plan, Writing Plan),
  - or exception layers (Holidays, Sick Days).
- A **CalendarEvent** is the actual scheduled event on the calendar grid.
- Chain logic operates on **CalendarEvent[]** within a single Calendar.

The goal is to keep the domain **generic**, so homeschool is just a preset — not the foundation.

---

# 1. Core Concepts

## 1.1 Calendar

### What it is

A `Calendar` is a self-contained plan, workflow, or schedule.

Examples:

- `Homeschool – 2025–2026`
- `Content Plan – Q1 2026`
- `Fitness Program – Winter Block`

A Calendar holds:

- default scheduling rules,
- a collection of layers,
- and all scheduled events across those layers.

### Type

```ts
export interface Calendar {
  id: string;
  name: string;
  presetKey?: string;
  startDate: string | null;
  includeWeekends: boolean;
  includeExceptions: boolean;
  layers: CalendarLayer[];
  scheduledItems: CalendarEvent[]; // all events for this calendar
}
```

### Notes

- `includeWeekends` — when false, chains skip weekends.
- `includeExceptions` — when false, chains skip exception-layer events.
- `layers` — tracks within the calendar.
- `scheduledItems` — flattened list of all `CalendarEvent` objects.

---

## 1.2 CalendarLayer (Layer)

### What it is

A `CalendarLayer` represents one “track” inside a Calendar.

Examples:

- Mercy  
- Grace  
- Nehemiah  
- Math Plan  
- Writing Plan  
- Holidays *(exception layer)*

Layers allow multiple streams to live inside the same calendar, while sharing scheduling rules.

### Type

```ts
export type ChainBehavior = 'linked' | 'independent';
export type LayerKind = 'standard' | 'exception';

export interface CalendarLayer {
  key: string;              // unique within a Calendar
  name: string;
  color: string;
  description: string;
  chainBehavior: ChainBehavior;
  kind: LayerKind;          // 'standard' or 'exception'
}
```

### Behavior

#### chainBehavior
- `'linked'` → event movements propagate through the sequence.
- `'independent'` → moving an event does NOT move following ones.

#### kind
- `'standard'` → normal planning.
- `'exception'` → dates that should *block* scheduling (holidays, sick days, blackout dates).

Exception layers do not chain events — their purpose is to define unavailable dates.

---

## 1.3 CalendarEvent (aka ScheduledItem)

### What it is

A `CalendarEvent` is the **actual event on the calendar UI**.

It maps 1:1 to:

- a Google Calendar event,  
- an iCalendar VEVENT,  
- a scheduled “task" on a given day, etc.

### Type

```ts
export interface CalendarEvent {
  id: string;
  date: string;           // ISO date: YYYY-MM-DD
  layerKey: string;       // maps to CalendarLayer.key
  sequenceIndex: number;  // position in ordered layer sequence
  title: string;
  description?: string;
  notes: string;
  durationDays?: number;
  metadata?: Record<string, unknown>;
}

export type ScheduledItem = CalendarEvent; // alias for backwards compatibility
```

### Notes

- `sequenceIndex` is required for sequencing + chain logic.
- `durationDays` allows multi-day events.
- `metadata` allows custom domains (subjects, tags, categories).

---

# 2. Creation & Templates

Templates are **not persisted types** — they are *inputs* that generate real `CalendarEvent`s.

---

## 2.1 LayerTemplateConfig

```ts
export type LayerTemplateMode = 'generated' | 'manual';

export interface LayerTemplateConfig {
  mode: LayerTemplateMode;
  itemCount?: number;         // number of auto-generated items
  titlePattern?: string;      // pattern such as "Day {n}" or "Workout {n}"
}
```

- `generated` → produce N sequential CalendarEvents automatically.
- `manual` → no auto-create; user adds events later.

---

## 2.2 CreateCalendarRequest

```ts
export interface CreateCalendarLayerInput {
  key: string;
  name: string;
  color?: string;
  description?: string;
  chainBehavior?: ChainBehavior;
  kind?: LayerKind;
  templateConfig?: LayerTemplateConfig;
}

export interface CreateCalendarRequest {
  name: string;
  presetKey?: string;
  startDate?: string | null;
  includeWeekends?: boolean;
  includeExceptions?: boolean;
  layers?: CreateCalendarLayerInput[];
  templateItemsByLayer?: Record<
    string,
    Array<{
      title: string;
      description?: string;
      durationDays?: number;
    }>
  >;
}
```

### Important

- `templateItemsByLayer[layerKey]` is converted to real CalendarEvent objects.
- After creation, **only CalendarEvent** exists.
- No persistent TemplateItem model is introduced.

---

# 3. Chain & Shift Behavior

## 3.1 Chain Behavior

From `CalendarLayer.chainBehavior`:

- `'linked'` → events shift together.
- `'independent'` → only moved event changes date.

## 3.2 ShiftScheduledItemsRequest

```ts
export interface ShiftScheduledItemsRequest {
  scheduledItemId: string; // anchor event
  shiftByDays: number;     // positive or negative
  layerKeys?: string[];    // optional subset of layers
}
```

### Shift Logic

When shifting:

- skip weekends if `includeWeekends=false`
- skip exception-layer dates if `includeExceptions=false`
- propagate shifts through linked layers only
- operate ONLY on the current calendar

---

# 4. Exceptions & Holidays

Exceptions are modeled as **layers**, not as a separate entity.

A CalendarLayer with:

```ts
kind: 'exception'
```

…is treated as an exception layer.

Events inside exception layers represent **dates to avoid scheduling**.

The engine honors:

- layering,
- showing exceptions on the grid,
- blocking scheduling on exception dates,
- shift operations skipping them.

---

# 5. UI Mapping

This section defines how domain objects appear in the UI.

### Header Dropdown
Shows available Calendars.  
Selecting one switches context.

### Left Sidebar
Represents the layers inside the active Calendar.

- “+ Layer” adds a new CalendarLayer.
- Each layer can be toggled visible/invisible.

### Calendar Grid (Month / Week / Day)
Every visible element is a **CalendarEvent**.

User actions:

- Drag → update event date.
- Drop → possibly triggers chain logic.
- Filter → hide/show by layer.

### Board / Kanban View
Optional future mode: same events displayed as sequence cards instead of calendar dates.

---

# 6. Naming Rules (AI, UI, & Code)

Use ONLY:

- **Calendar**
- **CalendarLayer**
- **CalendarEvent**

Deprecated:

- `ScheduledItem` (kept only as alias)
- “Day” as a special domain term (use “event” or “title” instead)

Avoid:

- creating persistent TemplateItem models  
- nesting items  
- homeschool-specific labels in core types  

All generic vocabulary must reflect real calendar standards.

---

# 7. Homeschool / Abeka as a Preset

Homeschool is simply a preset configuration.

### Example preset

- name: `"Homeschool – 2025–2026"`
- `includeWeekends: false`
- `includeExceptions: true`
- layers:
  - `Mercy` (standard, linked)
  - `Grace` (standard, linked)
  - `Nehemiah` (standard, linked)
  - `Holidays` (exception)
- template items:
  - “Day 1”, “Day 2”… generated via titlePattern
  - holidays auto-generated or imported

Everything remains compatible with non-homeschool use cases:

- fitness programs  
- content pipelines  
- publishing calendars  
- academic semester builders  
- manufacturing/maintenance cycles  

The core system stays general.

---

# End of Domain Model
