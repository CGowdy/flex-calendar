# Flex Calendar – Product Spec

A planning tool to align homeschooling days with the Abeka reference schedule while adapting to real-life changes (late starts, holidays, sick days, and catch-up plans).

## Status Legend

- [ ] Planned
- [x] Implemented

## Implementation Status

- [ ] Setup Wizard: generate plan (days, weekdays, holidays, labels)
- [ ] Chain Move with reflow (drag/drop or date change)
- [ ] Patterned labeling with tokens (e.g., "Day {number}")
- [ ] Holidays: add/remove and reflow schedule
- [ ] Catch-up Planner: rules, forecast, apply
- [ ] Sick/Off days marking and reflow
- [ ] Timeline/Dashboard with Abeka delta and projections
- [ ] Per-student calendars (Abeka, Holidays, Student A/B/C)
- [ ] Calendar-level chaining toggle (`isChained`); Holidays non-chained
- [ ] Fractional days via split (1 of 2, 2 of 2)
- [ ] ICS export (subscribe in Google/iCal)

Implemented (Infrastructure/Docs)
- [x] Bun-first dev workflow and Docker Compose
- [x] Workflow and Product Spec documentation

## Purpose

Make it fast and safe to plan 170+ school days, auto-label days (Day 1…Day 170), and keep them chained so that when any day moves, the rest follow intelligently (skipping weekends/holidays and respecting constraints). Provide forecasting and catch-up planning when behind the reference schedule.

## Glossary

- Abeka Reference: The ideal, official progression (e.g., “Day 52 on today’s date”).
- School Day: A numbered instructional day (Day 1…Day N) in the user’s plan.
- Holiday: A non-school day; the schedule skips these automatically.
- Calendar: A named collection of dated entries (e.g., Abeka, Holidays, Student A, Student B).
- Chaining Calendar: A calendar that enforces sequential order; when one entry moves, subsequent entries reflow (e.g., Abeka and Student calendars).
- Non-chaining Calendar: A calendar whose entries are independent (e.g., Holidays).
- Chain Move: Moving a single day to another date shifts all subsequent days in order.
- Catch-up Plan: Temporary rule set (e.g., “double days on Tue/Thu”) to accelerate progress.
- Forecast: Predicted calendar end date or when parity with Abeka is reached.

## Goals

- Create a numbered schedule starting from a custom start date, with specific meeting days (e.g., Mon–Fri) and holidays.
- Easily move a single day; automatically shift subsequent days (“domino/chain move”).
- Define repeating patterns with auto-incremented labels (e.g., “Day {number}” x170).
- Plan catch-up strategies (double days, 1.5 days) and forecast their impact.
- Quickly mark sick/closed days and reflow the remaining schedule.
- Manage multiple calendars: Abeka (reference), Holidays (non-chaining), and per-student calendars (A/B/C) with chaining enabled.
- Optional export to personal calendars (ICS/Google) for daily reference. (Future)

## Non-Goals (for now)

- Full Abeka content import (lessons/materials).
- Multi-user auth/roles.
- Complex timetable per-subject.

## Core Features

1) Setup Wizard
- Inputs: start date, number of school days (default 170), school weekdays, holidays (manual list and/or ICS URL), optional target end date.
- Output: Generated day rows: Day 1…Day N with assigned dates following rules.

2) Chain Move
- Drag/drop or date change for a specific Day X.
- Reassign dates for Day X+1…N sequentially, skipping weekends/holidays.
- Preserve unique numbering; “Day {number}” labeling remains consistent.

3) Patterned Generation and Labeling
- Template label supports tokens: “Day {number}”, “Week {weekNumber} Day {weekdayIndex}” (future).
- Repeat count (e.g., 170), weekdays, and exclusion set (holidays).

4) Holidays and Closures
- Manually add/remove holidays (single days or ranges).
- Optional subscribe/import ICS to populate holiday set. (Future)
- Reflow schedule when holidays are added/removed.

5) Catch-up Planning and Forecasting
- Define rules per date range: e.g., “On Tue/Thu do 2 days”, “On Mon do 1.5 days”.
- Constraints: maximum per-day “load”, allowed weekdays.
- Preview scenario and see predicted “reach-parity date” vs Abeka and final end date.
- Apply scenario to commit changes (creates reflowed dates).

6) Sick/Off Days
- Mark one or more dates as “no school” → reflows the remaining schedule.

7) Timeline/Dashboard
- Shows current day vs Abeka reference day, delta (behind/ahead).
- Displays forecast end date and milestones.

8) Export (Future)
- ICS export of user schedule to subscribe in Google/iCal.

9) Calendars & Tracks
- Support multiple calendars: Abeka (reference), Holidays (non-chaining), Student A/B/C (chaining).
- Calendar-level setting `isChained` determines whether moves reflow subsequent entries.
- Holidays calendar acts as an exclusion source for scheduling; its events do not reflow.

## Key User Flows

1) Create initial plan
- Open Setup Wizard → enter start date (e.g., Sep 1), days=170, weekdays=Mon–Fri.
- Add/confirm holidays.
- Generate schedule with labels “Day 1…Day 170” assigned to valid dates.

2) Chain move for holiday conflicts or adjustments
- From grid/timeline, drag “Day 65” to the next Monday.
- System reassigns Day 66…Day 170 to subsequent valid dates (skip holidays/weekends).

3) Catch-up planning when behind
- From dashboard, see “You are on Day 11; Abeka is at Day 52 (−41).”
- Open Catch-up Planner, add a rule: “Tue/Thu = 2 days/day” for the next 4 weeks.
- Preview forecast; accept to apply → dates reflow and dashboard updates parity estimate.

4) Mark sick days
- Mark Tue–Wed as sick. Those become non-school days.
- Schedule reflows; subsequent days move forward accordingly.

5) Per-student planning
- Create Student A/B/C calendars (chaining on).
- Move a student day; only that student calendar reflows (Abeka reference remains a guide).
- Holidays calendar is visible and used for exclusions but does not reflow.

## Acceptance Criteria

Setup Wizard
- Given start date Sep 1 (Mon–Fri), 170 days, and a set of holidays, when I generate the plan, then:
  - Day 1 is on the first valid weekday on/after Sep 1.
  - Day N lands on a valid weekday excluding holidays.
  - Labels are “Day {number}” from 1..170 without gaps/duplicates.

Chain Move
- Given an existing plan and a holiday collision on Day 65, when I move Day 65 to the following Monday, then:
  - Day 65’s date equals the selected Monday.
  - Day 66…Day 170 are re-assigned to the next available valid dates (skip weekends/holidays).
  - No two school days share the same date; ordering is preserved.

Patterned Generation
- Given a label template “Day {number}” and 170 repeats, when I generate, then labels read Day 1…Day 170.
- Changing the template and regenerating updates all labels consistently.

Holidays
- Given I add a holiday on a scheduled date, then the affected day and all subsequent days are moved to next valid dates.
- Removing a holiday reflows forward days back into available dates.

Catch-up Forecast
- Given current day is 11 and Abeka is day 52, when I apply “Tue/Thu = 2 days/day” for 4 weeks, then:
  - A forecast displays a new parity date and new projected end date.
  - On Tue/Thu in that range, total assigned “load” per day equals 2 days (or 1.5 for fractional settings).
  - Applying the plan updates the schedule accordingly and keeps labels consistent.

Sick Days
- Marking a sick-day range removes those dates from valid school days and reflows subsequent days.

Timeline/Dashboard
- After any change, the dashboard shows current day index, delta vs Abeka, and projected end date.

ICS Export (Future)
- A generated ICS reflects the current schedule (labels, dates, times), subscribable by Google/iCal.

Calendars and Chaining
- When a calendar has `isChained=true`, moving any entry causes subsequent entries in that calendar to reflow; when `isChained=false`, the move does not affect other entries.
- The Holidays calendar acts as an exclusion set for scheduling; its events never reflow other calendars directly.
- Student calendars reflow independently from one another; Abeka calendar is used for delta/forecast reference.

## Technical Notes (aligns with current code)

- UI: `SetupWizard`, `CalendarDashboard`, `DraggableCalendarGrid`, `DayDetailDrawer`, `CalendarTimeline`
- Store/Composables: `useCalendarStore`, `useScheduleAdjuster` handle chain moves and reflows.
- API: `Fastify` server (`/api/calendars`) manages persistence of calendars/days/holidays.
- Validation: `zod` schemas under `src/server/schemas`.

Suggested Server Operations
- POST /api/calendars: create plan (start, days, weekdays, holidays, labelTemplate, isChained, type: abeka|holidays|student, studentId?)
- PATCH /api/calendars/:id: update calendar settings (isChained, weekdays, label template, etc.)
- PATCH /api/calendars/:id/day/:dayNumber: reassign specific day date (chain reflow)
- PATCH /api/calendars/:id/holidays: add/remove holidays (reflow)
- POST /api/calendars/:id/forecast: forecast with rules (no commit)
- POST /api/calendars/:id/apply-catchup: apply chosen rules (commit)

Reflow Algorithm (High-Level)
1) Maintain an ordered list of Day 1…N.
2) Compute a generator of valid dates from a start (skip weekends/holidays).
3) When a day moves, set its date, then walk forward assigning dates from the generator.
4) Enforce uniqueness (one day per date); never assign to excluded dates.

Constraints
- Timezone awareness (use consistent tz for date math).
- Performance: operations on 170–250 days should feel instant (<50ms typical reflow).
- Idempotent updates; server schemas validate ranges and duplicates.

## Milestones

MVP
- Setup Wizard with generation (days, weekdays, holidays, labels).
- Chain Move via drag/drop or date picker.
- Dashboard with delta vs Abeka and projected end date.
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


