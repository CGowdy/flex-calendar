# How To

## Add a calendar entry UX

- **Use quick add** (`CalendarQuickAddForm.vue`) whenever you just need the minimal calendar fields. The form now lives inside the timeline sidebar popover (anchored to the "+" button). Keep `showQuickAdd` in the dashboard store/component as the single source of truth and wire the `submit` event to `createCalendarAndSelect`.
- When there are **no calendars yet**, fall back to rendering the same quick-add card inline (so users can create the first calendar without the sidebar). This is already handled in `CalendarDashboard.vue`; follow that pattern if you introduce other entry points.
- **Use the setup wizard** (`SetupWizard.vue`) when you need grouping-level control (auto-shift, color, title pattern). Keep this accessible through a “Use Setup Wizard” action rather than as the default experience.
- Both paths share the same store action, so keep the payload shape aligned with `CreateCalendarRequest`. Add new fields to the quick-add form only if they are essential for every calendar.

## Add a feature component

```bash
mkdir -p src/features/<feature>/components
touch src/features/<feature>/components/MyComponent.vue
```

- Use `<script setup lang="ts">` with typed props/emits.
- Co-locate Vitest coverage under `components/__tests__`.
- Document any new flows here (Context → Decision → Consequences) so future you remembers why the change exists.


