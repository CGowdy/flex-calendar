# How To

## Adopt Tailwind-first styling

- All calendar feature components now rely on Tailwind utility classes (light/dark) instead of scoped CSS. When touching files under `src/features/calendar`, extend the existing class stacks rather than adding new `<style>` blocks.
- Prefer semantic utility groupings over bespoke class names. Example: `rounded-2xl border border-slate-200/80 bg-white/95 p-5` for cards, `text-slate-600 dark:text-slate-200` for body copy, and `bg-gradient-to-r from-blue-600 to-indigo-500` for brand CTA buttons.
- Reuse shared patterns from `CalendarQuickAddForm.vue`, `CalendarTimeline.vue`, and `SetupWizard.vue` when building new cards, forms, or drawers. Copy/paste + tweak the utility strings; avoid inventing parallel design tokens.
- If a utility combination starts repeating across multiple files, capture it in a small helper component or document the stack here (Context → Decision → Consequences) before abstracting.

## Add a calendar entry UX

- **Use quick add** (`CalendarQuickAddForm.vue`) whenever you just need the minimal calendar fields. The form now lives inside the timeline sidebar popover (anchored to the "+" button). Keep `showQuickAdd` in the dashboard store/component as the single source of truth and wire the `submit` event to `createCalendarAndSelect`.
- When there are **no calendars yet**, fall back to rendering the same quick-add card inline (so users can create the first calendar without the sidebar). This is already handled in `CalendarDashboard.vue`; follow that pattern if you introduce other entry points.
- **Use the setup wizard** (`SetupWizard.vue`) when you need layer-level control (chain behavior, color, template mode). Keep this accessible through a “Use Setup Wizard” action rather than as the default experience.
- Both paths share the same store action, so keep the payload shape aligned with `CreateCalendarRequest`. Add new fields to the quick-add form only if they are essential for every calendar.

## Add a feature component

```bash
mkdir -p src/features/<feature>/components
touch src/features/<feature>/components/MyComponent.vue
```

- Use `<script setup lang="ts">` with typed props/emits.
- Co-locate Vitest coverage under `components/__tests__`.
- Document any new flows here (Context → Decision → Consequences) so future you remembers why the change exists.


