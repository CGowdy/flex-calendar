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
    const [studentCheckbox] = within(studentBCard as HTMLElement).getAllByRole('checkbox')
    await user.click(studentCheckbox)

    // Disable auto-shift for holidays explicitly
    const holidayCard = screen.getByText('Holidays / Breaks', { selector: 'span' }).closest('li')
    expect(holidayCard).not.toBeNull()
    const holidayAutoShift = within(holidayCard as HTMLElement).getAllByRole('checkbox')[1]
    if ((holidayAutoShift as HTMLInputElement).checked) {
      await user.click(holidayAutoShift)
    }

    const submitButton = screen.getByRole('button', { name: /save calendar/i })
    await user.click(submitButton)

    const submitEvents = emitted().submit
    expect(submitEvents).toBeTruthy()

    const payload = submitEvents![0][0]
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

