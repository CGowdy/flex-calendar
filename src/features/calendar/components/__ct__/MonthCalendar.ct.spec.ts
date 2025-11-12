import { test, expect } from '@playwright/experimental-ct-vue'
import MonthCalendar from '../MonthCalendar.vue'
import type { Calendar } from '../../types/calendar'

function makeCalendar(): Calendar {
  const start = '2025-11-01T00:00:00.000Z'
  return {
    id: 'cal-1',
    name: 'CT Calendar',
    source: 'custom',
    startDate: start,
    totalDays: 3,
    includeWeekends: false,
    includeHolidays: false,
    groupings: [
      { key: 'abeka', name: 'Abeka', color: '#2563eb', description: '', autoShift: true },
    ],
    days: [
      {
        id: 'd1',
        date: '2025-11-10T00:00:00.000Z',
        groupingKey: 'abeka',
        groupingSequence: 1,
        label: 'Day 1',
        notes: '',
        events: [{ id: 'e1', title: 'Abeka Lesson 1', description: '', durationDays: 1, metadata: {} }],
      },
      {
        id: 'd2',
        date: '2025-11-11T00:00:00.000Z',
        groupingKey: 'abeka',
        groupingSequence: 2,
        label: 'Day 2',
        notes: '',
        events: [{ id: 'e2', title: 'Abeka Lesson 2', description: '', durationDays: 1, metadata: {} }],
      },
    ],
  }
}

test.describe('MonthCalendar', () => {
  test('renders events for visible groupings', async ({ mount }) => {
    const calendar = makeCalendar()
    const component = await mount(MonthCalendar, {
      props: {
        calendar,
        selectedDayId: null,
        viewDate: new Date('2025-11-10T00:00:00.000Z'),
        visibleGroupingKeys: ['abeka'],
      },
    })

    await expect(component.getByText('Day 1')).toBeVisible()
    await expect(component.getByText('Abeka Lesson 1')).toBeVisible()
  })

  test('emits select-day when clicking event', async ({ mount }) => {
    const calendar = makeCalendar()
    const emitted: string[] = []
    const component = await mount(MonthCalendar, {
      props: {
        calendar,
        selectedDayId: null,
        viewDate: new Date('2025-11-10T00:00:00.000Z'),
        visibleGroupingKeys: ['abeka'],
        onSelectDay: (id: string) => emitted.push(id),
      },
    })

    await component.getByText('Day 2').click()
    expect(emitted).toContain('d2')
  })
})


