# Flex Calendar – Product Spec

A planning tool for any chainable schedule—lesson plans, content pipelines, or training ramps. Flex Calendar keeps layered plans in sync (reference vs progress vs exception layers) while respecting real-life adjustments like time off, accelerations, or catch-up strategies.

> **ADR-lite (2025-11-14)**
> Context: Chain-move reflow now respects weekends/exceptions.
> Decision: Update implementation status + roadmap emphasis (exception CRUD, reference layer deltas).
> Consequences: MVP focus shifts to data/UX gaps instead of core chaining behavior.

## Status Legend

- [ ] Planned
- [x] Implemented

## Implementation Status

- [~] Setup Wizard: generate plan (items/events, weekdays, labels) - **~80%**: Wizard now collects global/per-layer exceptions; ICS import/bulk input still pending.
- [x] Chain Move with reflow (drag/drop or date change) - **~85%**: Smart reflow skips weekends + exceptions; still needs date picker + collision handling.
- [x] Patterned labeling with tokens (e.g., "Item {number}") - **~80%**: Basic {n} token works
- [~] Exceptions: add/remove and reflow schedule - **~70%**: Wizard seeding + dashboard manager exist; need bulk/ICS import and nicer grid hints.
- [ ] Catch-up Planner: rules, forecast, apply - **0%**: Not started
- [ ] Sick/Off days marking and reflow - **0%**: Not started
- [~] Timeline/Dashboard with reference layer delta and projections - **~30%**: Basic stats exist, but no reference comparison/delta
- [x] Layered calendars (reference, progress, exceptions) - **~90%**: Layers work, but no reference layer delta tracking
- [x] Calendar-level chaining toggle (`isChained`); Exception layers independent - **~95%**: `autoShift` property works and smart reflow honors it; still needs exception CRUD to make exclusions meaningful.
- [~] Fractional days via split (1 of 2, 2 of 2) - **~60%**: Backend + basic UI/tests exist; needs polish/animations.
- [ ] ICS export (subscribe in Google/iCal) - **0%**: Future (v1.2)
- [ ] Events can span multiple days and single events over multiple days appear as one component on the calendar

Implemented (Infrastructure/Docs)
- [x] Bun-first dev workflow and Docker Compose
- [x] Workflow and Product Spec documentation
- [x] Fastify API server with MongoDB persistence
- [x] Vue 3 + TypeScript frontend with Pinia store
- [x] Basic calendar CRUD operations
- [x] Drag-and-drop in month view
- [x] Multiple calendar/layer support

**See `docs/implementation-status.md` for detailed analysis.**

## Purpose

Make it fast and safe to plan 170+ scheduled items, auto-label items (Item 1…Item 170), and keep them chained so that when any item moves, the rest follow intelligently (skipping weekends/exceptions and respecting constraints). Provide forecasting and catch-up planning when behind the reference sequence.

## Glossary

- Reference Layer: The ideal progression (template sequence) driving deltas and forecasts.
- Calendar Event (aka Scheduled Item): A dated instance on any layer.
- Exception Layer: A layer containing blackout or pause dates; other layers skip these dates.
- Calendar: A container of layers (reference, progress, exception, scenario).
- Linked Layer: A layer whose items reflow sequentially when one item moves.
- Independent Layer: A layer whose items stay put when other layers move (e.g., exceptions).
- Chain Move: Moving a single scheduled item reassigns subsequent items in linked layers.
- Catch-up Plan: Temporary rule set (e.g., “Tue/Thu = +1 item/day”) to accelerate progress.
- Forecast: Predicted calendar end date or when parity with the reference layer is reached.

## Goals

- Create a numbered schedule starting from a custom start date, with specific meeting days (e.g., Mon–Fri) and exception dates.
- Easily move a single event; automatically shift subsequent events (“domino/chain move”).
- Define repeating patterns with auto-incremented labels (e.g., “Item {number}” x170).
- Plan catch-up strategies (double days, 1.5 days) and forecast their impact.
- Quickly mark blocked/unavailable days and reflow the remaining schedule.
- Manage multiple layers: reference (linked), progress (linked), exception (independent), plus optional scenario layers.
- Optional export to personal calendars (ICS/Google) for daily reference. (Future)

## Examples / Use Cases

- **Homeschool preset (e.g., Abeka, BJU, CC)** – Reference layer mirrors curriculum pacing, progress layers track each student, and an exception layer blocks out holidays or sick weeks.
- **Editorial/content pipeline** – Reference layer outlines the planned publish cadence, each channel/product has a progress layer, and exception layer captures content freezes/embargoes.
- **Fitness or training blocks** – Reference layer captures the planned workouts, progress layers log actual completion, and an exception layer tracks deload weeks, injuries, or travel.

## Non-Goals (for now)

- Full preset content import (lessons/materials).
- Multi-user auth/roles.
- Complex timetable per-subject.

## Core Features

1) Setup Wizard
- Inputs: start date, number of items (default 170), weekdays, exceptions (manual list and/or ICS URL), optional target end date.
- Output: Generated sequence: Item 1…Item N with assigned dates following rules.

2) Chain Move
- Drag/drop or date change for a specific Item X.
- Reassign dates for Item X+1…N sequentially, skipping weekends/exceptions.
- Preserve unique numbering; “Item {number}” labeling remains consistent.

3) Patterned Generation and Labeling
- Template label supports tokens: “Item {number}”, “Week {weekNumber} Day {weekdayIndex}” (future).
- Repeat count (e.g., 170), weekdays, and exclusion set (exceptions).

4) Exceptions and Closures
- Manually add/remove exceptions (single days or ranges).
- Optional subscribe/import ICS to populate exception set. (Future)
- Reflow schedule when exceptions are added/removed.

5) Catch-up Planning and Forecasting
- Define rules per date range: e.g., “On Tue/Thu do 2 days”, “On Mon do 1.5 days”.
- Constraints: maximum per-day “load”, allowed weekdays.
- Preview scenario and see predicted “reach-parity date” vs the reference layer and final end date.
- Apply scenario to commit changes (creates reflowed dates).

6) Blocked Days
- Mark one or more dates as “unavailable” → reflows the remaining schedule.

7) Timeline/Dashboard
- Shows current scheduled item vs the reference layer item, delta (behind/ahead).
- Displays forecast end date and milestones.

8) Export (Future)
- ICS export of user schedule to subscribe in Google/iCal.

9) Calendars & Tracks
- Support multiple layers: reference (linked), exceptions (independent), and any number of progress layers (linked).
- Calendar-level setting `isChained` determines whether moves reflow subsequent entries.
- Exception layers act as an exclusion source for scheduling; their events do not reflow.

## Key User Flows

1) Create initial plan
- Open Setup Wizard → enter start date (e.g., Sep 1), items=170, weekdays=Mon–Fri.
- Add/confirm exceptions.
- Generate schedule with labels “Item 1…Item 170” assigned to valid dates.

2) Chain move for exception conflicts or adjustments
- From grid/timeline, drag “Item 65” to the next Monday.
- System reassigns Item 66…Item 170 to subsequent valid dates (skip weekends/exceptions).

3) Catch-up planning when behind
- From dashboard, see “You are on Item 11; Reference layer is at Item 52 (−41).”
- Open Catch-up Planner, add a rule: “Tue/Thu = 2 days/day” for the next 4 weeks.
- Preview forecast; accept to apply → dates reflow and dashboard updates parity estimate.

- 4) Mark blocked days
- Mark Tue–Wed as unavailable. Those dates become exceptions.
- Schedule reflows; subsequent days move forward accordingly.

5) Per-student planning
- Create Student A/B/C calendars (chaining on).
- Move a progress layer item; only that layer reflows (the reference layer remains the guide).
- Exception layer is visible and used for exclusions but does not reflow.

## Acceptance Criteria

Setup Wizard
- Given start date Sep 1 (Mon–Fri), 170 items, and a set of exceptions, when I generate the plan, then:
  - Item 1 is on the first valid weekday on/after Sep 1.
  - Item N lands on a valid weekday excluding exceptions.
  - Labels are “Item {number}” from 1..170 without gaps/duplicates.

Chain Move
- Given an existing plan and an exception collision on Item 65, when I move Item 65 to the following Monday, then:
  - Item 65’s date equals the selected Monday.
  - Item 66…Item 170 are re-assigned to the next available valid dates (skip weekends/exceptions).
  - No two scheduled items share the same date; ordering is preserved.

Patterned Generation
- Given a label template “Item {number}” and 170 repeats, when I generate, then labels read Item 1…Item 170.
- Changing the template and regenerating updates all labels consistently.

Exceptions
- Given I add an exception on a scheduled date, then the affected item and all subsequent items are moved to next valid dates.
- Removing an exception reflows subsequent items back into available dates.

Catch-up Forecast
- Given current item is 11 and the reference layer is item 52, when I apply “Tue/Thu = 2 items/day” for 4 weeks, then:
  - A forecast displays a new parity date and new projected end date.
  - On Tue/Thu in that range, total assigned “load” per day equals 2 days (or 1.5 for fractional settings).
  - Applying the plan updates the schedule accordingly and keeps labels consistent.

Sick Days
- Marking a sick-day range removes those dates from valid school days and reflows subsequent days.

Timeline/Dashboard
- After any change, the dashboard shows current item index, delta vs the reference layer, and projected end date.

ICS Export (Future)
- A generated ICS reflects the current schedule (labels, dates, times), subscribable by Google/iCal.

Calendars and Chaining
- When a calendar has `isChained=true`, moving any entry causes subsequent entries in that calendar to reflow; when `isChained=false`, the move does not affect other entries.
- The Holidays calendar acts as an exclusion set for scheduling; its events never reflow other calendars directly.
- Progress layers reflow independently from one another; the reference layer is used for delta/forecast reference.

## Technical Notes (aligns with current code)

- UI: `SetupWizard`, `CalendarDashboard`, `DraggableCalendarGrid`, `DayDetailDrawer`, `CalendarTimeline`
- Store/Composables: `useCalendarStore`, `useScheduleAdjuster` handle chain moves and reflows.
- API: `Fastify` server (`/api/calendars`) manages persistence of calendars/layers/events and exception handling.
- Validation: `zod` schemas under `src/server/schemas`.

Suggested Server Operations
- POST /api/calendars: create plan (start, items, weekdays, exceptions, labelTemplate, isChained)
- PATCH /api/calendars/:id: update calendar settings (isChained, weekdays, label template, etc.)
- PATCH /api/calendars/:id/item/:sequenceIndex: reassign specific item date (chain reflow)
- PATCH /api/calendars/:id/exceptions: add/remove exceptions (reflow)
- POST /api/calendars/:id/forecast: forecast with rules (no commit)
- POST /api/calendars/:id/apply-catchup: apply chosen rules (commit)

Reflow Algorithm (High-Level)
1) Maintain an ordered list of Item 1…N.
2) Compute a generator of valid dates from a start (skip weekends/exceptions).
3) When an item moves, set its date, then walk forward assigning dates from the generator.
4) Enforce uniqueness (one item per date); never assign to excluded dates.

Constraints
- Timezone awareness (use consistent tz for date math).
- Performance: operations on 170–250 days should feel instant (<50ms typical reflow).
- Idempotent updates; server schemas validate ranges and duplicates.

## Milestones

MVP
- Setup Wizard with generation (days, weekdays, holidays, labels).
- Chain Move via drag/drop or date picker.
- Dashboard with delta vs the reference layer and projected end date.
- Sick/holiday marking and reflow.
- Per-student calendars with calendar-level chaining toggle.

v1.1
- Catch-up Planner with rules and forecast preview/apply.
- Fractional days via split events (1 of 2, 2 of 2).

v1.2
- ICS export for personal calendars.

## Open Questions
- Fractional days: Prefer split into two parts (1 of 2, 2 of 2) to represent halves; scheduling rules decide placement. Status: future.
- Per-student vs family plan: Decided → start with per-student calendars (A/B/C) and add family multi-track later.


