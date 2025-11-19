import { cleanup, render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import LayerQuickAddForm from '../LayerQuickAddForm.vue'

afterEach(() => {
  cleanup()
})

describe('LayerQuickAddForm', () => {
  it('emits a standard layer payload by default', async () => {
    const user = userEvent.setup()
    const { emitted } = render(LayerQuickAddForm)

    await user.type(screen.getByLabelText(/Layer name/i), 'Content Plan')
    await user.click(screen.getByRole('button', { name: /Add layer/i }))

    expect(emitted().submit?.[0]?.[0]).toMatchObject({
      name: 'Content Plan',
      color: '#2563eb',
      kind: 'standard',
    })
  })

  it('emits an exception layer when the toggle is enabled', async () => {
    const user = userEvent.setup()
    const { emitted } = render(LayerQuickAddForm)

    await user.click(screen.getByLabelText(/Treat as exception layer/i))
    await user.type(screen.getByLabelText(/Layer name/i), 'Holidays')
    await user.click(screen.getByRole('button', { name: /Add layer/i }))

    expect(emitted().submit?.[0]?.[0]).toMatchObject({
      name: 'Holidays',
      kind: 'exception',
    })
  })
})


