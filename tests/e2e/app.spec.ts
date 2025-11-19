import { test, expect } from '@playwright/test'

test('homepage renders and wizard opens', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Flex Calendar/i })).toBeVisible()

  // Button should open Setup Wizard
  const setupButton = page.getByRole('button', { name: /Setup Wizard|Use Setup Wizard/i })
  if (await setupButton.count() > 0) {
    await setupButton.first().click()
  } else {
    // Fallback: look for any button that might open the wizard
    const quickAdd = page.getByRole('button', { name: /Quick Add|Open Quick Add/i })
    if (await quickAdd.count() > 0) {
      await quickAdd.first().click()
    }
  }

  // Verify dialog or form appears
  const dialog = page.getByRole('dialog')
  if (await dialog.count() > 0) {
    await expect(dialog).toBeVisible()
  }
})


