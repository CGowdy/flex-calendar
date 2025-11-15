import { test, expect } from '@playwright/experimental-ct-vue'
import MonthCalendar from '../MonthCalendar.vue'
import type { Calendar } from '../../types/calendar'

function makeCalendar(): Calendar {
  const start = '2025-11-01T00:00:00.000Z'
  return {
    id: 'cal-1',
    name: 'CT Calendar',
    presetKey: 'ct',
    startDate: start,
    includeWeekends: false,
    includeExceptions: false,
    layers: [
      {
        key: 'reference',
        name: 'Reference',
        color: '#2563eb',
        description: '',
        chainBehavior: 'linked',
        kind: 'standard',
      },
    ],
    scheduledItems: [
      {
        id: 'd1',
        date: '2025-11-10T00:00:00.000Z',
        layerKey: 'reference',
        sequenceIndex: 1,
        title: 'Reference Lesson 1',
        description: 'Intro lesson',
        notes: '',
        durationDays: 1,
        metadata: {},
      },
      {
        id: 'd2',
        date: '2025-11-11T00:00:00.000Z',
        layerKey: 'reference',
        sequenceIndex: 2,
        title: 'Reference Lesson 2',
        description: '',
        notes: '',
        durationDays: 1,
        metadata: {},
      },
    ],
  }
}

test.describe('MonthCalendar', () => {
  test('renders events for visible layers', async ({ mount }) => {
    const calendar = makeCalendar()
    const component = await mount(MonthCalendar, {
      props: {
        calendar,
        selectedDayId: null,
        viewDate: new Date('2025-11-10T00:00:00.000Z'),
        visibleLayerKeys: ['reference'],
      },
    })

    await expect(component.getByText('Reference Lesson 1')).toBeVisible()
    await expect(component.getByText('Intro lesson')).toBeVisible()
  })

  test('emits select-day when clicking event', async ({ mount }) => {
    const calendar = makeCalendar()
    const emitted: string[] = []
    const component = await mount(MonthCalendar, {
      props: {
        calendar,
        selectedDayId: null,
        viewDate: new Date('2025-11-10T00:00:00.000Z'),
        visibleLayerKeys: ['reference'],
        'onSelect-day': (id: string) => emitted.push(id),
      },
    })

    await component.getByText('Reference Lesson 2').click()
    expect(emitted).toContain('d2')
  })
})


