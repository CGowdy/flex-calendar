import { describe, expect, it } from 'vitest'

import { useScheduleAdjuster } from '../useScheduleAdjuster'
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
})

