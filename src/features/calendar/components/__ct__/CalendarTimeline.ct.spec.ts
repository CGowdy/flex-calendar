import { test, expect } from '@playwright/experimental-ct-vue'
import CalendarTimeline from '../CalendarTimeline.vue'
import type { Calendar } from '../../types/calendar'
import { createPinia } from 'pinia'

function makeCalendar(): Calendar {
  return {
    id: 'cal-1',
    name: 'CT Calendar',
    source: 'custom',
    startDate: '2025-11-01T00:00:00.000Z',
    totalDays: 2,
    includeWeekends: false,
    includeHolidays: false,
    groupings: [
      { key: 'abeka', name: 'Abeka', color: '#2563eb', description: '', autoShift: true },
      { key: 'holidays', name: 'Holidays', color: '#ca8a04', description: '', autoShift: false },
    ],
    days: [
      {
        id: 'd1',
        date: '2025-11-10T00:00:00.000Z',
        groupingKey: 'abeka',
        groupingSequence: 1,
        label: 'Day 1',
        notes: '',
        events: [{ id: 'e1', title: 'Lesson 1', description: '', durationDays: 1, metadata: {} }],
      },
      {
        id: 'd2',
        date: '2025-11-11T00:00:00.000Z',
        groupingKey: 'abeka',
        groupingSequence: 2,
        label: 'Day 2',
        notes: '',
        events: [{ id: 'e2', title: 'Lesson 2', description: '', durationDays: 1, metadata: {} }],
      },
    ],
  }
}

test.skip('renders calendars list and mini calendar', async ({ mount }) => {
  const calendar = makeCalendar()
  const component = await mount(CalendarTimeline, {
    props: {
      calendar,
      selectedDayId: null,
      viewDate: new Date('2025-11-10T00:00:00.000Z'),
      onUpdateViewDate: () => {},
      onJump: () => {},
    },
    hooks: {
      async beforeMount(app) {
        app.use(createPinia())
      },
    },
  })

  await expect(component.getByRole('heading', { name: calendar.name })).toBeVisible()
  await expect(component.getByText('Calendars')).toBeVisible()
  await expect(component.getByLabel('Abeka')).toBeVisible()
})


