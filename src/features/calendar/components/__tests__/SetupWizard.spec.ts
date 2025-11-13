import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import SetupWizard from '../SetupWizard.vue'

describe('SetupWizard', () => {
  it('emits create payload with selected groupings', async () => {
    const user = userEvent.setup()
    const { emitted } = render(SetupWizard)

    const nameField = screen.getByLabelText(/calendar name/i)
    await user.clear(nameField)
    await user.type(nameField, 'Family Plan')

    const totalDaysField = screen.getByLabelText(/total instructional days/i)
    await user.clear(totalDaysField)
    await user.type(totalDaysField, '180')

    // Enable Student B grouping
    const studentBCard = screen.getByText('Student B', { selector: 'span' }).closest('li')
    expect(studentBCard).not.toBeNull()
    const studentChecks = within(studentBCard as HTMLElement).getAllByRole('checkbox') as HTMLElement[]
    await user.click(studentChecks[0]!)

    // Disable auto-shift for holidays explicitly
    const holidayCard = screen.getByText('Holidays / Breaks', { selector: 'span' }).closest('li')
    expect(holidayCard).not.toBeNull()
    const holidayChecks = within(holidayCard as HTMLElement).getAllByRole('checkbox') as HTMLElement[]
    const holidayAutoShift = holidayChecks[1] as HTMLInputElement
    if (holidayAutoShift.checked) {
      await user.click(holidayAutoShift)
    }

    const submitButton = screen.getByRole('button', { name: /save calendar/i })
    await user.click(submitButton)

    const submitEvents = emitted().submit as unknown[][] | undefined
    expect(submitEvents).toBeTruthy()
    if (!submitEvents || submitEvents.length === 0 || (submitEvents[0] as unknown[] | undefined)?.length === 0) {
      throw new Error('expected submit events')
    }
    const first = submitEvents[0] as unknown[]
    const payload = first[0] as {
      name: string
      totalDays: number
      groupings: Array<{ key: string; autoShift: boolean }>
    }
    expect(payload.name).toBe('Family Plan')
    expect(payload.totalDays).toBe(180)
    expect(payload.groupings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'abeka', autoShift: true }),
        expect.objectContaining({ key: 'student-b', autoShift: true }),
        expect.objectContaining({ key: 'holidays', autoShift: false }),
      ])
    )
  })
})

