import { describe, expect, it } from 'vitest'

import { useScheduleAdjuster } from '../useScheduleAdjuster'
import { buildExceptionLookup } from '../useExceptionLookup'
import type { Calendar } from '../../types/calendar'

const toUtcIso = (date: string) => new Date(`${date}T00:00:00.000Z`).toISOString()

const baseCalendar: Calendar = {
  id: 'cal-1',
  name: 'Sample Calendar',
  presetKey: 'homeschool-abeka',
  startDate: toUtcIso('2025-08-04'),
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
    {
      key: 'progress-a',
      name: 'Progress A',
      color: '#059669',
      description: '',
      chainBehavior: 'linked',
      kind: 'standard',
    },
    {
      key: 'exceptions',
      name: 'Exceptions',
      color: '#f97316',
      description: '',
      chainBehavior: 'independent',
      kind: 'exception',
    },
  ],
  scheduledItems: [
    {
      id: 'reference-1',
      date: toUtcIso('2025-08-04'),
      layerKey: 'reference',
      sequenceIndex: 1,
      title: 'Reference Item 1',
      description: '',
      notes: '',
      durationDays: 1,
      metadata: {},
    },
    {
      id: 'reference-2',
      date: toUtcIso('2025-08-05'),
      layerKey: 'reference',
      sequenceIndex: 2,
      title: 'Reference Item 2',
      description: '',
      notes: '',
      durationDays: 1,
      metadata: {},
    },
    {
      id: 'progress-2',
      date: toUtcIso('2025-08-05'),
      layerKey: 'progress-a',
      sequenceIndex: 2,
      title: 'Progress Item 2',
      description: '',
      notes: '',
      durationDays: 1,
      metadata: {},
    },
    {
      id: 'exception-2',
      date: toUtcIso('2025-08-05'),
      layerKey: 'exceptions',
      sequenceIndex: 1,
      title: 'Labor Day',
      description: '',
      notes: '',
      durationDays: 1,
      metadata: {},
    },
  ],
}

describe('useScheduleAdjuster', () => {
  it('shifts items within the same layer only, skipping weekends and exceptions', () => {
    const adjuster = useScheduleAdjuster()
    const shifted = adjuster.shiftScheduledItemsLocally(baseCalendar, {
      scheduledItemId: 'reference-2',
      shiftByDays: 2,
    })

    const referenceItem = shifted.scheduledItems.find(
      (item) => item.id === 'reference-2'
    )
    const progressItem = shifted.scheduledItems.find(
      (item) => item.id === 'progress-2'
    )
    const exceptionItem = shifted.scheduledItems.find(
      (item) => item.id === 'exception-2'
    )

    expect(referenceItem).toBeDefined()
    expect(progressItem).toBeDefined()
    expect(exceptionItem).toBeDefined()

    // Reference item should shift
    expect(new Date(referenceItem!.date).toISOString()).toBe(
      new Date('2025-08-07T00:00:00.000Z').toISOString()
    )

    // Progress item should NOT shift (different layer)
    expect(new Date(progressItem!.date).toISOString()).toBe(
      new Date('2025-08-05T00:00:00.000Z').toISOString()
    )

    // Exception item should NOT shift (exception layers don't chain)
    expect(new Date(exceptionItem!.date).toISOString()).toBe(
      new Date('2025-08-05T00:00:00.000Z').toISOString()
    )
  })

  it('limits shifts when layer keys are provided', () => {
    const adjuster = useScheduleAdjuster()
    const shifted = adjuster.shiftScheduledItemsLocally(baseCalendar, {
      scheduledItemId: 'reference-2',
      shiftByDays: -1,
      layerKeys: ['reference'],
    })

    const referenceItem = shifted.scheduledItems.find(
      (item) => item.id === 'reference-2'
    )
    const progressItem = shifted.scheduledItems.find(
      (item) => item.id === 'progress-2'
    )

    expect(new Date(referenceItem!.date).toISOString()).toBe(
      new Date('2025-08-04T00:00:00.000Z').toISOString()
    )
    expect(new Date(progressItem!.date).toISOString()).toBe(
      baseCalendar.scheduledItems.find((item) => item.id === 'progress-2')!.date
    )
  })

  it('only shifts items within the same layer, even when sequences tie across layers', () => {
    const adjuster = useScheduleAdjuster()
    const calendar = JSON.parse(JSON.stringify(baseCalendar)) as Calendar

    const progressItem = calendar.scheduledItems.find(
      (item) => item.id === 'progress-2'
    )!
    const referenceItem = calendar.scheduledItems.find(
      (item) => item.id === 'reference-2'
    )!
    calendar.scheduledItems = [
      calendar.scheduledItems[0]!,
      progressItem,
      referenceItem,
      calendar.scheduledItems.find((item) => item.id === 'exception-2')!,
    ]

    const shifted = adjuster.shiftScheduledItemsLocally(calendar, {
      scheduledItemId: 'reference-2',
      shiftByDays: 1,
    })

    const updatedReference = shifted.scheduledItems.find(
      (item) => item.id === 'reference-2'
    )
    const updatedProgress = shifted.scheduledItems.find(
      (item) => item.id === 'progress-2'
    )

    expect(updatedReference).toBeDefined()
    expect(updatedProgress).toBeDefined()
    // Reference item should shift
    expect(new Date(updatedReference!.date).toISOString()).toBe(
      new Date('2025-08-06T00:00:00.000Z').toISOString()
    )
    // Progress item should NOT shift (different layer)
    expect(new Date(updatedProgress!.date).toISOString()).toBe(
      new Date('2025-08-05T00:00:00.000Z').toISOString()
    )
  })

  it('preserves downstream gaps when earlier items move', () => {
    const adjuster = useScheduleAdjuster()
    let calendar = JSON.parse(JSON.stringify(baseCalendar)) as Calendar

    calendar = adjuster.shiftScheduledItemsLocally(calendar, {
      scheduledItemId: 'reference-2',
      shiftByDays: 2,
    })

    const item1AfterFirstShift = calendar.scheduledItems.find(
      (item) => item.id === 'reference-1'
    )!
    const item2AfterFirstShift = calendar.scheduledItems.find(
      (item) => item.id === 'reference-2'
    )!
    const initialGapMs =
      new Date(item2AfterFirstShift.date).getTime() -
      new Date(item1AfterFirstShift.date).getTime()

    const shiftedAgain = adjuster.shiftScheduledItemsLocally(calendar, {
      scheduledItemId: 'reference-1',
      shiftByDays: -1,
    })

    const item1AfterSecondShift = shiftedAgain.scheduledItems.find(
      (item) => item.id === 'reference-1'
    )!
    const item2AfterSecondShift = shiftedAgain.scheduledItems.find(
      (item) => item.id === 'reference-2'
    )!
    const finalGapMs =
      new Date(item2AfterSecondShift.date).getTime() -
      new Date(item1AfterSecondShift.date).getTime()

    expect(finalGapMs).toBe(initialGapMs)
  })

  it('skips global exception dates when shifting items', () => {
    const adjuster = useScheduleAdjuster()
    const calendar: Calendar = {
      id: 'cal-exception',
      name: 'Exception Test',
      startDate: toUtcIso('2025-12-14'),
      includeWeekends: false,
      includeExceptions: true,
      layers: [
        {
          key: 'mercy',
          name: "Mercy's School",
          color: '#ef4444',
          description: '',
          chainBehavior: 'linked',
          kind: 'standard',
          respectsGlobalExceptions: true,
        },
        {
          key: 'exceptions',
          name: 'Holidays',
          color: '#22c55e',
          description: '',
          chainBehavior: 'independent',
          kind: 'exception',
        },
      ],
      scheduledItems: [
        {
          id: 'mercy-73',
          date: toUtcIso('2025-12-12'),
          layerKey: 'mercy',
          sequenceIndex: 73,
          title: 'Day 73',
          description: '',
          notes: '',
          durationDays: 1,
          metadata: {},
        },
        {
          id: 'mercy-74',
          date: toUtcIso('2025-12-13'),
          layerKey: 'mercy',
          sequenceIndex: 74,
          title: 'Day 74',
          description: '',
          notes: '',
          durationDays: 1,
          metadata: {},
        },
        {
          id: 'mercy-75',
          date: toUtcIso('2025-12-16'),
          layerKey: 'mercy',
          sequenceIndex: 75,
          title: 'Day 75',
          description: '',
          notes: '',
          durationDays: 1,
          metadata: {},
        },
        {
          id: 'exception-15',
          date: toUtcIso('2025-12-15'),
          layerKey: 'exceptions',
          sequenceIndex: 1,
          title: 'Exception Day',
          description: '',
          notes: '',
          durationDays: 1,
          metadata: {},
          // No targetLayerKeys = global exception
        },
      ],
    }

    // Shift Day 73 back by 1 day (from 12th to 11th)
    // Day 74 should move to 12th (where Day 73 was)
    // Day 75 should stay on 16th, skipping the exception on 15th
    const shifted = adjuster.shiftScheduledItemsLocally(calendar, {
      scheduledItemId: 'mercy-73',
      shiftByDays: -1,
    })

    const day73 = shifted.scheduledItems.find((item) => item.id === 'mercy-73')!
    const day74 = shifted.scheduledItems.find((item) => item.id === 'mercy-74')!
    const day75 = shifted.scheduledItems.find((item) => item.id === 'mercy-75')!

    // Day 73 should move back 1 day (to 11th)
    expect(new Date(day73.date).toISOString().slice(0, 10)).toBe('2025-12-11')

    // Day 74 should move to where Day 73 was (12th), maintaining 1-day gap
    expect(new Date(day74.date).toISOString().slice(0, 10)).toBe('2025-12-12')

    // Day 75 should stay on 16th, skipping the exception on 15th
    // The gap between Day 74 (13th) and Day 75 (16th) is preserved
    // When Day 74 moves to 12th, Day 75 maintains the same gap pattern, staying on 16th
    expect(new Date(day75.date).toISOString().slice(0, 10)).toBe('2025-12-16')
  })
})

