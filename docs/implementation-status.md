# Flex Calendar - Implementation Status Report

Generated: 2025-11-15

> **ADR-lite (2025-11-14)**
> Context: Smart reflow + holiday-aware utilities landed upstream.
> Decision: Refresh status to capture the new chaining behavior and reprioritize roadmap.
> Consequences: Progress now reflects ~60% MVP completion with Holiday CRUD as the next gating item.
>
> **ADR-lite (2025-11-15)**
> Context: Front-end calendar components were a mix of bespoke CSS blocks and utility classes, making dark mode, theming, and future contributions inconsistent.
> Decision: Migrate the entire `src/features/calendar/components` folder to Tailwind-only utility styling, codify the patterns in `docs/HowTo.md`, and drop the old scoped styles.
> Consequences: UI work now has a consistent token vocabulary (slate/brand palette, gradient CTAs, card shells) and hot reload for style tweaks no longer requires digging through style blocks.

## Executive Summary

Foundational infrastructure remains strong and the latest merge delivered the long-awaited **smart chain-move reflow** (skips weekends/holidays) across the client composable, server service, and shared date utilities. On 2025-11-15 we also unified the entire calendar feature UI on Tailwind utility classes, eliminating bespoke CSS and documenting the patterns in `HowTo.md`. With those pieces in place, the product is now roughly **55-60% complete** toward the MVP: core generation, chaining, and UI scaffolding work, yet exception CRUD, reference-layer delta tracking, and catch-up tooling are still outstanding.

## ✅ Fully Implemented

### Infrastructure & Core
- [x] **Bun-first dev workflow and Docker Compose** - Complete
- [x] **Workflow and Product Spec documentation** - Complete
- [x] **Fastify API server** with `/api/calendars` routes
- [x] **MongoDB persistence** with Mongoose models
- [x] **Vue 3 + TypeScript** frontend with Composition API
- [x] **Pinia store** for state management
- [x] **Zod validation** schemas
- [x] **Tailwind-first styling** for calendar feature components (cards, drawers, calendars, wizards)

### Basic Calendar Management
- [x] **Setup Wizard UI** - Basic form exists
- [x] **Calendar creation** - Can create calendars with layers
- [x] **Multiple calendar support** - Can create and switch between calendars
- [x] **Layer system** - Supports multiple layers (reference, progress, exceptions)
- [x] **Calendar-level chaining toggle** - `chainBehavior` per layer governs whether items are linked
- [x] **Patterned labeling** - Supports `{n}` token in `titlePattern` for event titles
- [x] **Basic day generation** - Generates days with sequential numbering

### UI Components
- [x] **CalendarDashboard** - Main dashboard view
- [x] **CalendarTimeline** - Sidebar with stats and upcoming lessons
- [x] **MonthCalendar** - Month view with drag-and-drop
- [x] **WeekCalendar** - Week view (exists but minimal)
- [x] **DayCalendar** - Day view (exists but minimal)
- [x] **DraggableCalendarGrid** - Board view with shift buttons
- [x] **SetupWizard** - Creation form

## ⚠️ Partially Implemented

### 1. Setup Wizard: generate plan (days, weekdays, holidays, labels)
**Status: ~70% complete**

**What works:**
- ✅ Start date input
- ✅ Total days input (default 170)
- ✅ Weekday selection (`includeWeekends` toggle)
- ✅ Multiple layer selection
- ✅ Label pattern support (`titlePattern` with `{n}` token)

**What's missing:**
- ❌ **Holiday input** - No UI to add/manage holidays during setup
- ❌ **Holiday exclusion data** - Server now supports exclusion via `generateValidSchoolDates()`, but the wizard never sends holidays so the flag stays inert
- ❌ **ICS URL import** - Not implemented (marked as future in spec)

**Code locations:**
- `src/features/calendar/components/SetupWizard.vue` - UI exists but no holiday management
- `src/server/services/calendarService.ts:generateDaysForGrouping()` - Doesn't check for holidays

### 2. Chain Move with reflow (drag/drop or date change)
**Status: ~85% complete**

**What works:**
- ✅ **Drag-and-drop** and **button shifting** stay stable in `MonthCalendar.vue` and `DraggableCalendarGrid.vue`.
- ✅ **Smart reflow algorithm** now respects the `includeWeekends` toggle and holiday exclusions using `generateValidSchoolDates()`.
- ✅ **Layer-aware reflow** still scopes to linked calendars or user-specified layer keys.
- ✅ **Unit tests** (`useScheduleAdjuster.spec.ts`) cover weekend/holiday skipping to guard regressions.

**What's missing:**
- ❌ **Date picker/direct date entry** — still limited to drag/drop or +/- buttons.
- ❌ **Collision detection + warnings** if a manual edit overlaps an existing day.
- ❌ **Holiday dependency** — behavior assumes holiday days exist, but no UI/API to create them yet.

**Code locations:**
- `src/server/utils/dateUtils.ts` - `nextSchoolDate()` and `generateValidSchoolDates()`
- `src/server/services/calendarService.ts:shiftCalendarDays()` - server-side reflow
- `src/features/calendar/composables/useScheduleAdjuster.ts` - client reflow + tests

### 3. Patterned labeling with tokens
**Status: ~80% complete**

**What works:**
- ✅ `{n}` token support in `titlePattern` for event titles
- ✅ Auto-incremented labels ("Day 1", "Day 2", etc.)

**What's missing:**
- ❌ More complex patterns like "Week {weekNumber} Day {weekdayIndex}" (marked as future)
- ❌ Label regeneration after changes

### 4. Holidays: add/remove and reflow schedule
**Status: ~20% complete**

**What works:**
- ✅ Exception layer exists (`chainBehavior: 'independent'`)
- ✅ Date utilities + reflow logic will skip any exception layer entries if/when they exist

**What's missing:**
- ❌ **Holiday management UI** - No way to add/remove holidays
- ❌ **Holiday persistence** - Setup Wizard and dashboard never create `holidays` days
- ❌ **Holiday reflow triggers** - Need API + server service to reflow after CRUD
- ❌ **API endpoint** - No `PATCH /api/calendars/:id/holidays` endpoint
- ❌ **ICS import** - Not implemented

**Code locations:**
- Missing: Holiday CRUD operations
- Missing: Holiday exclusion logic in `nextSchoolDate()` and `generateDaysForGrouping()`

### 5. Layered calendars (reference, progress, exceptions)
**Status: ~90% complete**

**What works:**
- ✅ Multiple layers per calendar
- ✅ Independent layer management
- ✅ Layer visibility toggles
- ✅ Color customization per layer

**What's missing:**
- ❌ **Reference layer tracking** - No way to compare progress layers to the reference layer
- ❌ **Delta calculation** - No "Item 11 vs Reference Item 52 (-41)" functionality

## ❌ Not Implemented

### 6. Catch-up Planner: rules, forecast, apply
**Status: 0% complete**

**Missing:**
- ❌ UI for defining catch-up rules (e.g., "Tue/Thu = 2 days/day")
- ❌ Forecast calculation engine
- ❌ Preview/apply workflow
- ❌ API endpoints: `POST /api/calendars/:id/forecast` and `POST /api/calendars/:id/apply-catchup`
- ❌ Fractional day support (1.5 days)

### 7. Sick/Off days marking and reflow
**Status: 0% complete**

**Missing:**
- ❌ UI to mark dates as sick/off days
- ❌ Reflow logic when sick days are marked
- ❌ Distinction between holidays and sick days

### 8. Timeline/Dashboard with reference delta and projections
**Status: ~30% complete**

**What works:**
- ✅ Basic timeline with start date, projected end date, total lessons
- ✅ Progress bar based on selected day
- ✅ Upcoming lessons list

**What's missing:**
- ❌ **Reference comparison** - No delta calculation ("You are on Item 11; Reference is at Item 52 (-41)")
- ❌ **Current day detection** - No automatic "today" vs schedule comparison
- ❌ **Forecast display** - No catch-up scenario projections
- ❌ **Milestones** - No milestone tracking

**Code locations:**
- `src/features/calendar/components/CalendarTimeline.vue` - Basic stats exist but no reference comparison

### 9. Fractional days via split (1 of 2, 2 of 2)
**Status: 0% complete**

**Missing:**
- ❌ Split event concept
- ❌ UI for creating/managing split days
- ❌ Scheduling logic for fractional days

### 10. ICS export (subscribe in Google/iCal)
**Status: 0% complete**

**Missing:**
- ❌ ICS file generation
- ❌ Export UI/endpoint
- ❌ Calendar subscription support

## Critical Gaps Analysis

### 1. No Holiday Management/Data Source

**Current State:**
- Exception layers can exist in data, and the new reflow utilities will respect any `layerKey === 'exceptions'` entries.
- There is still **no UI or API flow** to add/remove holidays, import ICS, or toggle exclusions post-setup.
- Setup Wizard does not collect holidays, so most calendars will never populate the exclusion set.

**Impact:** High — smart reflow depends on holiday data, but users cannot provide it yet, blocking MVP parity with the spec.

### 2. No Reference Layer Tracking

**Current State:**
- Reference layer data is stored like any other progress layer.
- Dashboard lacks delta calculations, "today vs reference layer" messaging, and milestones.
- No composable/service to compare the current date to the reference layer's pacing.

**Impact:** High — differentiating reference vs progress layers is central to the product promise and is part of the MVP milestone.

### 3. Missing API Endpoints

**Spec suggests:**
- `PATCH /api/calendars/:id/day/:dayNumber` - direct reassignment + audit trail
- `PATCH /api/calendars/:id/holidays` - holiday CRUD + reflow
- `POST /api/calendars/:id/forecast` - forecasting without commit
- `POST /api/calendars/:id/apply-catchup` - apply chosen rules

**Current:** Server exposes basic CRUD + shift operations only; all advanced flows still require manual DB edits.

### 4. Catch-up Planner & Sick Days Unstarted

- No UI, composables, or services exist for rule-based catch-up or sick-day marking.
- Timeline has no entry points to drive these flows.
- Forecasting math remains undefined/test-less.

## Recommended Next Steps

### Priority 1: Holiday Management & Exclusion Flows (Critical)

1. **Collect holidays during setup + edit time**
   - Extend `SetupWizard` with an inline holiday list (single dates + ranges, manual entry for now).
   - Add a `HolidayManager` component on the dashboard so admins can insert/remove exclusions later.
2. **Persist holidays through the API**
   - Add `PATCH /api/calendars/:id/holidays` for CRUD + automatic reflow.
   - Store holidays either as dedicated subdocuments or reuse the existing `exceptions` layer (but enforce `chainBehavior: 'independent'`).
3. **Trigger reflow + notify UI**
   - Reuse the new `generateValidSchoolDates()` helper after any holiday edit.

**Files:** `SetupWizard.vue`, `CalendarDashboard.vue` (new subcomponent), `src/server/routes/calendars.ts`, `calendarService.ts`, `calendarModel.ts`, `dateUtils.ts`.

### Priority 2: Reference Layer Tracking & Timeline (High)

1. **Comparison logic**
   - Add a composable/service (`useReferenceLayerComparison` or Pinia module) that maps "today" to current reference + progress layer indexes.
   - Persist metadata (e.g., `referenceCalendarId`) if needed for clarity.
2. **Timeline/Dashboard UI**
   - Surface "You are on Item X / Reference Item Y (ΔZ)" with status chips.
   - Highlight projected end date and parity date (placeholder calculations until catch-up planner ships).

**Files:** `CalendarTimeline.vue`, `CalendarDashboard.vue`, new composable in `src/features/calendar/composables/`.

### Priority 3: Setup Wizard Quality + Regeneration (High)

1. **Holiday inputs** feed into the calendar creation payload so that the new exclusion helpers are exercised immediately.
2. **Regenerate labels/dates** when templates or weekdays change, ensuring label consistency post-edit.

**Files:** `SetupWizard.vue`, `calendarService.ts`, supporting tests.

### Priority 4: Catch-up Planner (Medium)

- Same scope as before: UI rule builder, forecast preview/apply endpoints, and shared forecasting math (likely `catchUpService.ts` + Playwright/Vitest coverage).

### Priority 5: Sick Days (Medium)

- Introduce a `sickDays` collection or reuse `holidays` with metadata, add marking UI, and reuse reflow helpers.

### Priority 6: ICS Export (Low - Future)

- Keep parked for v1.2; no change.

## Testing Status

**Current test coverage:**
- ✅ Basic calendar service tests exist
- ✅ Component tests for SetupWizard
- ✅ Component tests for CalendarTimeline, MonthCalendar
- ✅ **New** composable tests for `useScheduleAdjuster` cover weekend/holiday skipping

**Missing tests:**
- ❌ Server-side reflow regression tests (date collisions, multi-layer scenarios)
- ❌ Holiday exclusion logic end-to-end (blocked by missing UI/API)
- ❌ Reference layer comparison calculations
- ❌ Catch-up forecast engine
- ❌ E2E tests for critical flows

## Architecture Notes

### Strengths
- Clean separation of concerns (UI, store, API, services)
- Type-safe throughout (TypeScript + Zod)
- Good component structure
- Flexible layer system

### Areas for Improvement
- Reflow logic needs to be centralized (currently duplicated)
- Holiday concept needs to be first-class (not just a layer)
- Reference layer needs dedicated abstraction
- Date utilities need to be more comprehensive

## Conclusion

The codebase now satisfies the spec-level chaining behavior but remains blocked on data/UX work that surfaces that capability. The most urgent issues are:

1. **Holiday management + data entry** — Without it, smart reflow cannot exercise weekend/holiday skipping in real scenarios.
2. **Reference layer tracking & dashboard deltas** — Users still lack visibility into where they stand.
3. **Setup wizard + Timeline polish** — Need better regeneration tooling and entry points before investing in catch-up or exports.

**Recommendation:** Tackle exception CRUD + reference comparisons immediately, then iterate on catch-up planner and sick days once the MVP loop (Plan → Adjust → Compare) feels solid.



