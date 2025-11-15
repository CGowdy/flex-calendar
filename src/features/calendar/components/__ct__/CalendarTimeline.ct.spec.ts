import { test, expect } from '@playwright/experimental-ct-vue'
import CalendarTimeline from '../CalendarTimeline.vue'
import type { Calendar } from '../../types/calendar'
import { createPinia } from 'pinia'
import type { App } from 'vue'

function makeCalendar(): Calendar {
  return {
    id: 'cal-1',
    name: 'CT Calendar',
    presetKey: 'ct',
    startDate: '2025-11-01T00:00:00.000Z',
    includeWeekends: false,
    includeExceptions: false,
    layers: [
      { key: 'reference', name: 'Reference', color: '#2563eb', description: '', chainBehavior: 'linked', kind: 'standard' },
      { key: 'exceptions', name: 'Exceptions', color: '#ca8a04', description: '', chainBehavior: 'independent', kind: 'exception' },
    ],
    scheduledItems: [
      {
        id: 'd1',
        date: '2025-11-10T00:00:00.000Z',
        layerKey: 'reference',
        sequenceIndex: 1,
        title: 'Lesson 1',
        description: '',
        notes: '',
        durationDays: 1,
        metadata: {},
      },
      {
        id: 'd2',
        date: '2025-11-11T00:00:00.000Z',
        layerKey: 'reference',
        sequenceIndex: 2,
        title: 'Lesson 2',
        description: '',
        notes: '',
        durationDays: 1,
        metadata: {},
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
      'onUpdate:viewDate': () => {},
      onJump: () => {},
    },
    hooks: {
      async beforeMount(app: App) {
        app.use(createPinia())
      },
    },
  })

  await expect(component.getByRole('heading', { name: calendar.name })).toBeVisible()
  await expect(component.getByText('Calendars')).toBeVisible()
  await expect(component.getByLabel('Reference')).toBeVisible()
})


