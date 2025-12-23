# Flex Calendar - Implementation Status Report

Generated: 2025-11-15

> **ADR-lite (2025-11-14)**
> Context: Smart reflow + exception-aware utilities landed upstream.
> Decision: Refresh status to capture the new chaining behavior and reprioritize roadmap.
> Consequences: Progress now reflects ~60% MVP completion with Holiday CRUD as the next gating item.
>
> **ADR-lite (2025-11-15)**
> Context: Front-end calendar components were a mix of bespoke CSS blocks and utility classes, making dark mode, theming, and future contributions inconsistent.
> Decision: Migrate the entire `src/features/calendar/components` folder to Tailwind-only utility styling, codify the patterns in `docs/HowTo.md`, and drop the old scoped styles.
> Consequences: UI work now has a consistent token vocabulary (slate/brand palette, gradient CTAs, card shells) and hot reload for style tweaks no longer requires digging through style blocks.

## Executive Summary

Foundational infrastructure remains strong and the latest merge delivered the long-awaited **smart chain-move reflow** (skips weekends/exceptions) across the client composable, server service, and shared date utilities. On 2025-11-15 we also unified the entire calendar feature UI on Tailwind utility classes, eliminating bespoke CSS and documenting the patterns in `HowTo.md`. With those pieces in place, the product is now roughly **55-60% complete** toward the MVP: core generation, chaining, and UI scaffolding work, yet exception CRUD, reference-layer delta tracking, and catch-up tooling are still outstanding.

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
- [x] **Basic event generation** - Generates events with sequential numbering

### UI Components
- [x] **CalendarDashboard** - Main dashboard view
- [x] **CalendarTimeline** - Sidebar with stats and upcoming lessons
- [x] **MonthCalendar** - Month view with drag-and-drop
- [x] **WeekCalendar** - Week view (exists but minimal)
- [x] **DayCalendar** - Day view (exists but minimal)
- [x] **DraggableCalendarGrid** - Board view with shift buttons
- [x] **SetupWizard** - Creation form

## ⚠️ Partially Implemented

### 1. Setup Wizard: generate plan (items/events, weekdays, exceptions, labels)
**Status: ~80% complete**

**What works:**
- ✅ Start date input
- ✅ Total days input (default 170)
- ✅ Weekday selection (`includeWeekends` toggle)
- ✅ Multiple layer selection
- ✅ Label pattern support (`titlePattern` with `{n}` token)
- ✅ Exception seeding UI (global vs targeted scope) that wires into calendar creation

**What's missing:**
- ❌ **ICS URL import** - Not implemented (marked as future in spec)

**Code locations:**
- `src/features/calendar/components/SetupWizard.vue` - Exception form + payload mapping
- `src/server/services/calendarService.ts: createCalendar()` - Applies seeded exception entries during generation

### 2. Chain Move with reflow (drag/drop or date change)
**Status: ~85% complete**

**What works:**
- ✅ **Drag-and-drop** and **button shifting** stay stable in `MonthCalendar.vue` and `DraggableCalendarGrid.vue`.
- ✅ **Smart reflow algorithm** now respects the `includeWeekends` toggle and exception exclusions using `generateValidSchoolDates()`.
- ✅ **Layer-aware reflow** still scopes to linked calendars or user-specified layer keys.
- ✅ **Unit tests** (`useScheduleAdjuster.spec.ts`) cover weekend/holiday skipping to guard regressions.

**What's missing:**
- ❌ **Date picker/direct date entry** — still limited to drag/drop or +/- buttons. *High priority for UX*
- ❌ **Collision detection + warnings** if a manual edit overlaps an existing day.

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

### 4. Exceptions: add/remove and reflow schedule
**Status: ~70% complete**

**What works:**
- ✅ Exception layers (`kind: 'exception'`) remain independent of chain logic.
- ✅ Date utilities and reflow logic skip weekends and exception entries (global + per-layer scope).
- ✅ Dashboard now includes an **Exceptions Manager** drawer for adding/removing blackout dates, with per-event targeting.
- ✅ API endpoint `PATCH /api/calendars/:id/exceptions` plus Playwright smoke coverage.

**What's missing:**
- ❌ No ICS import or bulk upload yet.
- ❌ No visual hint in the calendar grid when a drag hits an exception (tracked in Nice-to-have).

**Code locations:**
- `src/server/services/calendarService.ts:updateExceptions()`
- `src/server/utils/dateUtils.ts` (exception lookup + blocked dates)
- `src/features/calendar/components/ExceptionsManager.vue`

### 5. Layered calendars (reference, progress, exceptions)
**Status: ~90% complete**

**What works:**
- ✅ Multiple layers per calendar
- ✅ Independent layer management
- ✅ Layer visibility toggles
- ✅ Color customization per layer
- ✅ Stacked entries (multiple items on the same date within a layer) persist and are exercised in calendar service tests

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

### 7. Blocked days marking and reflow
**Status: 0% complete**

**Missing:**
- ❌ UI to mark dates as blocked/unavailable
- ❌ Reflow logic when blocked days are marked
- ❌ Distinction between general exceptions and other off-day reasons

### 8. Timeline/Dashboard with reference delta and projections
**Status: ~30% complete** ~~(CANCELLED - Direction change: As a general calendar, reference layer comparison doesn't align with the generic use case)~~

**What works:**
- ✅ Basic timeline with start date, projected end date, total lessons
- ✅ Progress bar based on selected item
- ✅ Upcoming items list

**What's missing:**
- ~~❌ **Reference comparison** - No delta calculation ("You are on Item 11; Reference is at Item 52 (-41)")~~ *Cancelled - not applicable to generic calendar*
- ❌ **Current day detection** - No automatic "today" vs schedule comparison
- ❌ **Forecast display** - No catch-up scenario projections
- ❌ **Milestones** - No milestone tracking

**Code locations:**
- `src/features/calendar/components/CalendarTimeline.vue` - Basic stats exist but no reference comparison

### 9. Fractional items via split (1 of 2, 2 of 2)
**Status: ~60% complete**

**What works:**
- ✅ Backend `POST /api/calendars/:id/split` converts an event into N sequential parts, shifting downstream items while respecting weekends/exceptions.
- ✅ Day detail drawer now exposes a “Split event” control (defaults to 2 parts, configurable up to 6).
- ✅ Split metadata (`splitGroupId`, `splitIndex`, `splitTotal`) is persisted and surfaced in the UI (titles show “Part X/Y”).
- ✅ Unit + Playwright smoke coverage for the split flow.

**What's missing:**
- ❌ No fancy animations (“shake and confetti“) yet—currently a utilitarian form.
- ❌ No merge/un-split action; users must delete parts manually.
- ❌ Split defaults to equal 1-day parts; no support for custom durations or arbitrary part labels.
- ❌ Planning decisions: UX should confirm part counts up front, offer contextual helper text (“Will create 3 consecutive days”), and show stacked cards when parts land on the same date.
- ❌ API polish: need an `unsplit` endpoint and conflict handling when the source event has already moved.

**Design plan (in progress):**
1. **UX adjustments**
   - Day Detail Drawer: convert the “Split” CTA into a mini-wizard with part-count selector, optional labels (“Morning/Afternoon”), and success micro-animation (shake + confetti) using a lightweight CSS animation.
   - Calendar views: when split parts sit on the same date, render a stacked badge showing `Part n/m` to avoid visual overlap.
2. **API additions**
   - Add `DELETE /api/calendars/:id/split/:groupId` (or `POST /split/merge`) to merge the parts back into a single event.
   - Extend `splitScheduledItem` payload with an optional `labels[]` array and `customDurations[]` to support uneven splits (defaulting to uniform days when omitted).
3. **Scheduling & validation**
   - Ensure the scheduler re-validates chains after an unsplit so downstream shifts don’t duplicate gaps.
   - Guard against splitting an event that already belongs to a split group unless the user merges first.
4. **Testing roadmap**
   - Add Vitest coverage for `unsplit`.
   - Expand Playwright smoke test to split an event, verify stacked rendering, and merge back.

### 10. ICS export (subscribe in Google/iCal)
**Status: 0% complete**

**Missing:**
- ❌ ICS file generation
- ❌ Export UI/endpoint
- ❌ Calendar subscription support

## Critical Gaps Analysis

### 1. Exception management still only post-creation

**Current State:**
- Exception layers exist, the Setup Wizard seeds global/per-layer exceptions, and the dashboard Exceptions Manager handles CRUD post-creation.
- No ICS import/bulk entry yet.

**Impact:** Medium — day-to-day workflows are unblocked, but onboarding still feels incomplete.

### 2. ~~No Reference Layer Tracking~~ (CANCELLED)

**Current State:**
- ~~Reference layer data is stored like any other progress layer.~~
- ~~Dashboard lacks delta calculations, "today vs reference layer" messaging, and milestones.~~
- ~~No composable/service to compare the current date to the reference layer's pacing.~~

**Impact:** ~~High — differentiating reference vs progress layers is central to the product promise and is part of the MVP milestone.~~ **CANCELLED** - As we generalize the app for any calendar use case, reference layer comparison becomes less relevant. The app now focuses on generic chainable calendars rather than homeschool-specific pacing comparisons.

### 3. Missing API Endpoints

**Spec suggests:**
- `PATCH /api/calendars/:id/item/:sequenceIndex` - direct reassignment + audit trail
- `PATCH /api/calendars/:id/exceptions` - exception CRUD + reflow
- `POST /api/calendars/:id/forecast` - forecasting without commit
- `POST /api/calendars/:id/apply-catchup` - apply chosen rules

**Current:** Server exposes basic CRUD + shift operations only; all advanced flows still require manual DB edits.

### 4. Catch-up Planner & Sick Days Unstarted

- No UI, composables, or services exist for rule-based catch-up or sick-day marking.
- Timeline has no entry points to drive these flows.
- Forecasting math remains undefined/test-less.

## Recommended Next Steps

### Priority 1: Exception Management & Exclusion Flows (Critical)

1. **Collect exceptions during setup + edit time**
- Extend `SetupWizard` with an inline exceptions list (single dates + ranges, manual entry for now).
- Add an `ExceptionManager` component on the dashboard so admins can insert/remove exclusions later.
2. **Persist exceptions through the API**
- Add `PATCH /api/calendars/:id/exceptions` for CRUD + automatic reflow.
- Store exceptions either as dedicated subdocuments or reuse the existing `exceptions` layer (`kind: 'exception'`).
3. **Trigger reflow + notify UI**
- Reuse the existing `generateValidSchoolDates()` helper after any exception edit.
- Nice-to-have: surface a toast/hint when a drag/drop hits an exception (“Skipped Oct 12 – Fall Break”) so users understand why the move jumped an extra day.

**Files:** `SetupWizard.vue`, `CalendarDashboard.vue` (new subcomponent), `src/server/routes/calendars.ts`, `calendarService.ts`, `calendarModel.ts`, `dateUtils.ts`.

### ~~Priority 2: Reference Layer Tracking & Timeline (High)~~ (CANCELLED)

~~1. **Comparison logic**
   - Add a composable/service (`useReferenceLayerComparison` or Pinia module) that maps "today" to current reference + progress layer indexes.
   - Persist metadata (e.g., `referenceCalendarId`) if needed for clarity.
2. **Timeline/Dashboard UI**
   - Surface "You are on Item X / Reference Item Y (ΔZ)" with status chips.
   - Highlight projected end date and parity date (placeholder calculations until catch-up planner ships).

**Files:** `CalendarTimeline.vue`, `CalendarDashboard.vue`, new composable in `src/features/calendar/composables/`.~~

**CANCELLED** - Direction change: As we generalize the app for any calendar use case, reference layer comparison becomes less relevant. Focus shifted to generic chainable calendar features.

### Priority 3: Setup Wizard Quality + Regeneration (High)

1. **Exception inputs** – extend to bulk import (ICS, CSV) and better validation/tooltips.
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
- ✅ **New** composable tests for `useScheduleAdjuster` cover weekend/exception skipping

**Missing tests:**
- ❌ Server-side reflow regression tests (date collisions, multi-layer scenarios)
- ❌ Exception exclusion logic end-to-end (blocked by missing UI/API)
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
- Exception concept needs to be first-class (Exception layers + UI)
- Reference layer needs dedicated abstraction
- Date utilities need to be more comprehensive

## Conclusion

The codebase now satisfies the spec-level chaining behavior but remains blocked on data/UX work that surfaces that capability. The most urgent issues are:

1. **Exception management + data entry** — Without it, smart reflow cannot exercise weekend/exception skipping in real scenarios.
2. **Reference layer tracking & dashboard deltas** — Users still lack visibility into where they stand.
3. **Setup wizard + Timeline polish** — Need better regeneration tooling and entry points before investing in catch-up or exports.

**Recommendation:** Tackle exception CRUD + reference comparisons immediately, then iterate on catch-up planner and sick days once the MVP loop (Plan → Adjust → Compare) feels solid.



