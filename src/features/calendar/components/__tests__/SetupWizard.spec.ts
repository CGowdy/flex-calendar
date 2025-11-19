import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import SetupWizard from '../SetupWizard.vue'
import type { CreateCalendarRequest } from '../../types/calendar'

describe('SetupWizard', () => {
  it('emits create payload with selected layers', async () => {
    const user = userEvent.setup()
    const { emitted } = render(SetupWizard)

    const nameField = screen.getByLabelText(/calendar name/i)
    await user.clear(nameField)
    await user.type(nameField, 'Family Plan')

    // Enable the additional layer
    const additionalCard = screen
      .getByText('Additional Layer', { selector: 'span' })
      .closest('li')
    expect(additionalCard).not.toBeNull()
    const additionalChecks = within(additionalCard as HTMLElement).getAllByRole('checkbox') as HTMLInputElement[]
    await user.click(additionalChecks[0]!)

    const itemCountInput = within(additionalCard as HTMLElement).getByLabelText(/items to generate/i)
    await user.clear(itemCountInput)
    await user.type(itemCountInput, '90')

    const submitButton = screen.getByRole('button', { name: /save calendar/i })
    expect((submitButton as HTMLButtonElement).disabled).toBe(false)
    await user.click(submitButton)

    const submitEvents = emitted().submit as unknown[][] | undefined
    expect(submitEvents).toBeTruthy()
    if (!submitEvents || submitEvents.length === 0 || (submitEvents[0] as unknown[] | undefined)?.length === 0) {
      throw new Error('expected submit events')
    }
    const first = submitEvents[0] as unknown[]
    const payload = first[0] as CreateCalendarRequest
    expect(payload.name).toBe('Family Plan')
    expect(payload.layers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'reference',
          templateConfig: expect.objectContaining({ mode: 'generated', itemCount: 180 }),
        }),
        expect.objectContaining({
          key: 'progress-b',
          templateConfig: expect.objectContaining({ mode: 'generated', itemCount: 90 }),
        }),
        expect.objectContaining({
          key: 'exceptions',
          templateConfig: expect.objectContaining({ mode: 'manual' }),
        }),
      ])
    )
  })

  it('shows scoped exception summary when added', async () => {
    const user = userEvent.setup()
    render(SetupWizard)

    const exceptionsSection = screen.getAllByRole('region', {
      name: /exception dates \(optional\)/i,
    })[0]!

    const dateInput = within(exceptionsSection).getByLabelText(/^date$/i)
    await user.clear(dateInput)
    await user.type(dateInput, '2025-12-24')

    const labelInput = within(exceptionsSection).getByLabelText(/label/i)
    await user.type(labelInput, 'Holiday Break')

    const customRadio = within(exceptionsSection).getByLabelText(/specific layers only/i)
    await user.click(customRadio)

    const targetSelect = within(exceptionsSection).getByLabelText(/target layers/i)
    await user.selectOptions(targetSelect, ['progress-a'])

    const addButton = within(exceptionsSection).getByRole('button', { name: /add exception/i })
    await user.click(addButton)
    await within(exceptionsSection).findByText(/holiday break/i)

    const summary = screen.getByText(/Holiday Break/i).closest('li')
    expect(summary).toBeTruthy()
    expect(summary?.textContent).toMatch(/Applies to/i)
    expect(summary?.textContent).toMatch(/Progress Layer/)
  })
})

