import { render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import CalendarQuickAddForm from '../CalendarQuickAddForm.vue'
import type { CreateCalendarRequest } from '../../types/calendar'

describe('CalendarQuickAddForm', () => {
  it('emits submit payload with trimmed values', async () => {
    const user = userEvent.setup()
    const { emitted } = render(CalendarQuickAddForm)

    const nameField = screen.getByLabelText(/calendar name/i)
    await user.type(nameField, '  Science Track ')

    const startDateField = screen.getByLabelText(/start date/i)
    await user.clear(startDateField)
    await user.type(startDateField, '2025-09-01')

    const itemsField = screen.getByLabelText(/template items per layer/i)
    await user.clear(itemsField)
    await user.type(itemsField, '175')

    const includeWeekends = screen.getByLabelText(/allow weekends/i)
    await user.click(includeWeekends)

    const includeExceptions = screen.getByLabelText(/exceptions/i)
    await user.click(includeExceptions)

    const submitButton = screen.getByRole('button', { name: /save calendar/i })
    await user.click(submitButton)

    const submitEvents = emitted().submit as unknown[][] | undefined
    expect(submitEvents).toBeTruthy()
    if (!submitEvents || submitEvents.length === 0) {
      throw new Error('Expected submit event')
    }

    const payload = submitEvents[0]?.[0] as CreateCalendarRequest
    expect(payload.name).toBe('Science Track')
    expect(payload.includeWeekends).toBe(true)
    expect(payload.includeExceptions).toBe(true)
    expect(payload.startDate).toBe('2025-09-01T00:00:00.000Z')
    const referenceLayer = payload.layers?.find((layer) => layer.key === 'reference')
    expect(referenceLayer?.templateConfig).toEqual(
      expect.objectContaining({ mode: 'generated', itemCount: 175 })
    )
  })

  it('emits cancel when cancel button is pressed', async () => {
    const user = userEvent.setup()
    const { emitted } = render(CalendarQuickAddForm)

    const cancelButtons = screen.getAllByRole('button', { name: /^cancel$/i })
    await user.click(cancelButtons.at(-1)!)

    const cancelEvents = emitted().cancel as unknown[][] | undefined
    expect(cancelEvents).toBeTruthy()
    expect(cancelEvents?.length).toBe(1)
  })
})


