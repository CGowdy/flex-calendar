# Additional Improvement Opportunities

## High-Impact Opportunities

### 1. Card Component
**Pattern**: `rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-700/70 dark:bg-slate-900`
**Found in**: 13+ locations across multiple components
**Impact**: High - Very common pattern that appears in:
- CalendarDashboard (inline create form, quick add section)
- SetupWizard (form sections)
- CalendarTimeline (main container)
- ExceptionsManager (form and list sections)
- DayDetailDrawer (article sections)
- MiniCalendar
- DraggableCalendarGrid (layer sections)
- CalendarQuickAddForm

**Recommendation**: Create a `Card.vue` component with padding variants (sm, md, lg) and optional shadow/elevation.

### 2. Replace formatDate Functions
**Pattern**: Multiple components define their own `formatDate` function
**Found in**:
- CalendarTimeline.vue (lines 115-124)
- DayDetailDrawer.vue (lines 50-58)
- DraggableCalendarGrid.vue (lines 46-51)

**Impact**: Medium - These should use `formatDate` from `useDateUtils.ts` which already exists and is more flexible.

### 3. Use Modal Component in ExceptionsManager
**Pattern**: Custom modal structure with transition
**Found in**: ExceptionsManager.vue (lines 123-130)
**Impact**: Medium - Could use the existing `Modal.vue` component for consistency.

### 4. Use CalendarDayCell in WeekCalendar
**Pattern**: Similar day cell structure to MonthCalendar
**Found in**: WeekCalendar.vue (lines 446-450)
**Impact**: Medium - WeekCalendar has similar day cell rendering that could use `CalendarDayCell` component.

## Medium-Impact Opportunities

### 5. FormSection Component
**Pattern**: Repeated form section structure with header and fields
**Found in**: SetupWizard, DayDetailDrawer, ExceptionsManager
**Impact**: Medium - Could standardize form section layout.

### 6. LayerColorPicker Component
**Pattern**: Color input with preview dot
**Found in**: CalendarTimeline.vue (lines 196-208)
**Impact**: Low-Medium - Could be extracted if used elsewhere.

### 7. EmptyState Component
**Pattern**: Empty state messages with consistent styling
**Found in**: Multiple components (CalendarDashboard, ExceptionsManager, CalendarTimeline)
**Impact**: Low-Medium - Could standardize empty states.

## Low-Impact / Future Considerations

### 8. Split SetupWizard
**Current**: ~605 lines
**Impact**: Low - Component is large but cohesive. Could split into:
- LayerConfiguration section
- ExceptionConfiguration section
- Summary/Review section

### 9. Extract Form Validation Logic
**Pattern**: Repeated validation patterns in forms
**Impact**: Low - Could create a `useFormValidation` composable if validation becomes more complex.

### 10. LoadingState Component
**Pattern**: Loading indicators appear in multiple places
**Impact**: Low - Could standardize loading states if they become more common.

## Recommended Priority Order

1. **Card Component** - Highest impact, most repeated pattern
2. **Replace formatDate functions** - Quick win, reduces duplication
3. **Use Modal in ExceptionsManager** - Consistency improvement
4. **Use CalendarDayCell in WeekCalendar** - Completes the refactoring we started
5. **FormSection component** - If forms grow more complex

## Implementation Notes

- **Card Component**: Should support padding variants and optional props for shadow/elevation
- **formatDate**: Components should import from `useDateUtils` and use the existing `formatDate` function with appropriate options
- **Modal**: ExceptionsManager can use Modal component with `size="xl"` for the larger layout
- **CalendarDayCell**: WeekCalendar can use the same component, just with different cell height (min-h-[140px] vs min-h-[110px])

