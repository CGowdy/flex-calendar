import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // Mock calendars API so the UI can render without backend
  await page.route('**/api/calendars', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{}',
      })
    }
  })
})

test('homepage renders and wizard opens', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Academic Planner/i })).toBeVisible()

  // Button should open Setup Wizard
  // Prefer the explicit "Launch Setup Wizard" if present, else click "New Calendar"
  const launch = page.getByRole('button', { name: 'Launch Setup Wizard' })
  if (await launch.count()) {
    await launch.first().click()
  } else {
    await page.getByRole('button', { name: 'New Calendar' }).first().click()
  }
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('heading', { name: /Create Academic Calendar/i })).toBeVisible()
})


