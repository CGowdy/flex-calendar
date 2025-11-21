# Component Refactoring Summary

## Overview
This document summarizes the component extraction and maintainability improvements made to make the codebase easier to maintain for a solo developer.

## New Reusable Components

### UI Components (`src/features/calendar/components/ui/`)

1. **FormInput.vue** - Standardized form input component
   - Supports text, number, date, textarea
   - Consistent styling with error states
   - Reduces ~27 repeated input class strings across the codebase

2. **Button.vue** - Standardized button component
   - Variants: primary, secondary, danger, ghost
   - Consistent sizing and styling
   - Replaces repeated button class strings

3. **Modal.vue** - Reusable modal/dialog wrapper
   - Consistent header/close button pattern
   - Size variants (sm, md, lg, xl)
   - Used by AddEventModal, can be used by ExceptionsManager, DayDetailDrawer

4. **ErrorMessage.vue** - Standardized error display
   - Consistent error styling
   - Used in CalendarDashboard and forms

5. **CalendarNavigation.vue** - Calendar navigation header
   - Prev/Next buttons with label
   - Used by MonthCalendar and WeekCalendar
   - Eliminates duplicate navigation code

## New Composables (`src/features/calendar/composables/`)

1. **useDateUtils.ts** - Shared date utility functions
   - `dayKey()` - Convert date to ISO string
   - `parseIsoDate()` - Parse ISO string to Date
   - `addDays()` - Add days to a date
   - `normalizeDate()` - Normalize date to midnight
   - `startOfMonth()`, `endOfMonth()`, `startOfWeek()`
   - `isWeekendDay()` - Check if day is weekend
   - `daysBetween()` - Calculate days between dates
   - `formatDate()` - Format date with Intl.DateTimeFormat
   - **Impact**: Eliminates duplicate date logic in MonthCalendar and WeekCalendar

2. **useExceptionLookup.ts** - Exception lookup logic
   - `buildExceptionLookup()` - Build exception map from calendar
   - `useExceptionLookup()` - Composable for exception checking
   - **Impact**: Removes ~50 lines of duplicate code from MonthCalendar and WeekCalendar

## Updated Components

### AddEventModal.vue
- Now uses `Modal`, `FormInput`, `Button`, and `ErrorMessage` components
- Reduced from ~215 lines to ~170 lines
- More consistent styling and behavior

### CalendarDashboard.vue
- Uses `ErrorMessage` component
- Cleaner error display

### MonthCalendar.vue
- Uses `CalendarNavigation` and `CalendarDayCell` components
- Uses `useDragAndDrop` composable
- Imports date utilities from `useDateUtils`
- Imports exception lookup from `useExceptionLookup`
- Removed ~200 lines of duplicate code (utilities + drag-and-drop + day cells)

### WeekCalendar.vue
- Uses `CalendarNavigation` component
- Imports date utilities from `useDateUtils`
- Imports exception lookup from `useExceptionLookup`
- Removed ~80 lines of duplicate utility functions
- Can be updated to use `CalendarDayCell` in the future

### CalendarDashboard.vue
- Uses `CalendarSelector`, `ViewModeSelector`, `Button`, `FormInput`, and `ErrorMessage` components
- Reduced from ~665 lines to ~600 lines
- More consistent UI patterns throughout

## Benefits

1. **Reduced Duplication**: Eliminated ~400+ lines of duplicate code across the codebase
2. **Consistency**: UI components ensure consistent styling and behavior
3. **Maintainability**: Changes to common patterns (buttons, inputs, modals, drag-and-drop) only need to be made in one place
4. **Discoverability**: Clear component names in `components/ui/` make it easy to find and reuse components
5. **Type Safety**: All components are fully typed with TypeScript
6. **Testability**: Smaller, focused components are easier to test in isolation
7. **Reusability**: Components can be easily reused in new features

## Additional Components (Phase 2)

### UI Components

6. **CalendarDayCell.vue** - Reusable calendar day cell component
   - Handles day cell rendering with events, drag-and-drop, and interactions
   - Used by MonthCalendar (can be used by WeekCalendar)
   - Eliminates ~80 lines of duplicate day cell code

### Composables

3. **useDragAndDrop.ts** - Shared drag-and-drop logic
   - Handles drag start, drag over, drag enter/leave, drop
   - Manages drag state (isDragging, draggingEventId, etc.)
   - Prevents click events during drag operations
   - **Impact**: Removes ~100 lines of duplicate drag-and-drop code

### Dashboard Components

7. **ViewModeSelector.vue** - View mode toggle buttons
   - Month, Week, Day, Board mode selector
   - Consistent styling with active state
   - Used by CalendarDashboard

8. **CalendarSelector.vue** - Calendar dropdown selector
   - Calendar selection dropdown with create option
   - Used by CalendarDashboard
   - Handles calendar switching and creation trigger

## Usage Examples

### Using FormInput
```vue
<FormInput
  v-model="form.title"
  type="text"
  label="Title"
  placeholder="Enter title"
  :disabled="busy"
  required
  :error="errors.title"
/>
```

### Using Button
```vue
<Button variant="primary" :disabled="busy" @click="handleSubmit">
  Save
</Button>
```

### Using Modal
```vue
<Modal
  :open="showModal"
  title="My Modal"
  description="Modal description"
  size="md"
  :busy="busy"
  @close="showModal = false"
>
  <!-- Modal content -->
</Modal>
```

### Using Date Utils
```typescript
import { dayKey, addDays, formatDate } from '@/features/calendar/composables/useDateUtils'

const today = new Date()
const tomorrow = addDays(today, 1)
const iso = dayKey(tomorrow)
const formatted = formatDate(tomorrow, { month: 'long', day: 'numeric' })
```

## File Structure

```
src/features/calendar/
├── components/
│   ├── ui/                    # NEW: Reusable UI components
│   │   ├── FormInput.vue
│   │   ├── Button.vue
│   │   ├── Modal.vue
│   │   ├── ErrorMessage.vue
│   │   ├── CalendarNavigation.vue
│   │   ├── CalendarDayCell.vue
│   │   ├── ViewModeSelector.vue
│   │   └── CalendarSelector.vue
│   └── [existing components]
└── composables/               # NEW: Shared composables
    ├── useDateUtils.ts
    ├── useExceptionLookup.ts
    └── useDragAndDrop.ts
```

