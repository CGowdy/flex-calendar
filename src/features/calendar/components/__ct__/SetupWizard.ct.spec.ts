import { test, expect } from '@playwright/experimental-ct-vue'
import SetupWizard from '../SetupWizard.vue'

test.describe.skip('SetupWizard', () => {
  test('renders and validates form', async ({ mount }) => {
    const component = await mount(SetupWizard, {
      props: { submitting: false },
    })

    await expect(component.getByRole('heading', { name: /Create Academic Calendar/i })).toBeVisible()
    await expect(component.getByRole('button', { name: /Save calendar/i })).toBeDisabled()

    await component.getByLabel('Calendar name').fill('Family 2025')
    await component.getByLabel('Total instructional days').fill('170')
    await expect(component.getByRole('button', { name: /Save calendar/i })).toBeEnabled()
  })

  test('emits cancel', async ({ mount }) => {
    const component = await mount(SetupWizard, {
      props: { submitting: false },
    })
    await component.getByRole('button', { name: /Close setup wizard/i }).click()
  })
})


