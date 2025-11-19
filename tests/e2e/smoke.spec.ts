import { test, expect, type Page } from '@playwright/test'

const API_BASE_URL = 'http://localhost:3334/api'

type ApiCalendar = {
  id: string
  scheduledItems: Array<{ id: string; layerKey: string; date: string }>
}

async function createCalendar(page: Page, name: string): Promise<ApiCalendar> {
  const calendarResponse = await page.request.post(`${API_BASE_URL}/calendars`, {
    data: {
      name,
      startDate: new Date('2025-09-01').toISOString(),
      includeWeekends: false,
      includeExceptions: true,
      layers: [
        {
          key: 'reference',
          name: 'Reference Layer',
          chainBehavior: 'linked',
          kind: 'standard',
          templateConfig: {
            mode: 'generated',
            itemCount: 10,
            titlePattern: 'Item {n}',
          },
        },
        {
          key: 'exceptions',
          name: 'Exceptions',
          chainBehavior: 'independent',
          kind: 'exception',
          templateConfig: { mode: 'manual' },
        },
      ],
    },
  })
  expect(calendarResponse.ok()).toBeTruthy()
  const calendar = (await calendarResponse.json()) as ApiCalendar
  expect(calendar.id).toBeTruthy()
  expect(calendar.scheduledItems.length).toBeGreaterThan(0)
  return calendar
}

async function selectCalendarByName(page: Page, name: string) {
  const calendarSelect = page.getByRole('combobox').first()
  await calendarSelect.waitFor({ state: 'visible' })
  await page.waitForSelector(`select option:has-text("${name}")`, {
    timeout: 5000,
    state: 'attached',
  })
  await calendarSelect.selectOption({ label: name })
  await page.waitForTimeout(500)
}

async function createScheduledItem(page: Page, calendarId: string, data: {
  layerKey: string
  date: string
  title: string
  description?: string
  durationDays?: number
}) {
  const response = await page.request.post(`${API_BASE_URL}/calendars/${calendarId}/events`, {
    data,
  })
  expect(response.ok()).toBeTruthy()
}

test('smoke: create calendar, add exception, verify reflow', async ({ page }) => {
  // Step 1: Navigate to app
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Flex Calendar/i })).toBeVisible()

  // Step 2: Create a calendar via API
  const calendar = await createCalendar(page, 'E2E Test Calendar')

  // Step 3: Reload page to see the calendar
  await page.reload()
  await expect(page.getByRole('heading', { name: /Flex Calendar/i })).toBeVisible()

  // Step 4: Select the calendar from dropdown (if it exists)
  await selectCalendarByName(page, 'E2E Test Calendar')

  // Step 5: Find a scheduled item date and add an exception on that date
  const firstItem = calendar.scheduledItems.find(
    (item: { layerKey: string }) => item.layerKey === 'reference'
  )
  expect(firstItem).toBeDefined()
  const exceptionDate = new Date(firstItem.date).toISOString().split('T')[0]

  // Step 6: Add exception via API
  const exceptionResponse = await page.request.patch(
    `${API_BASE_URL}/calendars/${calendar.id}/exceptions`,
    {
      data: {
        addEntries: [
          {
            date: exceptionDate,
            title: 'Test Holiday',
          },
        ],
      },
    }
  )
  expect(exceptionResponse.ok()).toBeTruthy()
  const updatedCalendar = await exceptionResponse.json()

  // Step 7: Verify exception was added
  const exceptionEvents = updatedCalendar.scheduledItems.filter(
    (item: { layerKey: string }) => item.layerKey === 'exceptions'
  )
  expect(exceptionEvents.length).toBe(1)
  expect(exceptionEvents[0].title).toBe('Test Holiday')

  // Step 8: Verify reference layer items were reflowed (the first item should have moved)
  const updatedReferenceItems = updatedCalendar.scheduledItems
    .filter((item: { layerKey: string }) => item.layerKey === 'reference')
    .sort((a: { sequenceIndex: number }, b: { sequenceIndex: number }) =>
      a.sequenceIndex - b.sequenceIndex
    )

  // The first item should no longer be on the exception date
  const firstRefItem = updatedReferenceItems[0]
  const firstRefDate = new Date(firstRefItem.date).toISOString().split('T')[0]
  expect(firstRefDate).not.toBe(exceptionDate)

  // Step 9: Reload page and verify UI shows the exception
  await page.reload()
  await page.waitForTimeout(1000) // Wait for calendar to load

  // Verify the calendar grid or month view shows the exception
  // This is a basic check - in a real scenario you'd look for the exception event in the UI
  const pageContent = await page.content()
  expect(pageContent).toContain('E2E Test Calendar')
})

test('smoke: calendar creation and basic UI interaction', async ({ page }) => {
  await page.goto('/')

  // Verify initial state
  await expect(page.getByRole('heading', { name: /Flex Calendar/i })).toBeVisible()

  // Look for "Use Setup Wizard" or "Open Quick Add" button
  const setupButton = page.getByRole('button', { name: /Setup Wizard|Quick Add|Create/i })
  if (await setupButton.count() > 0) {
    await setupButton.first().click()

    // Verify wizard or form appears
    const dialog = page.getByRole('dialog')
    if (await dialog.count() > 0) {
      await expect(dialog).toBeVisible()
    }
  }
})

test('smoke: add event via quick button', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Flex Calendar/i })).toBeVisible()

  await createCalendar(page, 'Add Event Calendar')
  await page.reload()
  await selectCalendarByName(page, 'Add Event Calendar')

  const todayIso = new Date().toISOString().split('T')[0]

  await page.getByRole('button', { name: 'Add Event' }).click()
  const dialog = page.getByRole('dialog').filter({ hasText: /Add event/i })
  await expect(dialog).toBeVisible()

  await dialog.getByLabel('Layer').selectOption({ label: 'Reference Layer' })
  await dialog.getByLabel('Date').fill(todayIso)
  await dialog.getByLabel('Title').fill('Playwright Added Event')
  await dialog.getByRole('button', { name: /Save event/i }).click()

  await expect(dialog).toBeHidden({ timeout: 5000 })
  await expect(page.getByText('Playwright Added Event').first()).toBeVisible({
    timeout: 5000,
  })
})

test('smoke: multi-day event spans across week boundary', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Flex Calendar/i })).toBeVisible()

  const calendar = await createCalendar(page, 'Multi Span Calendar')

  const baseDate = new Date()
  baseDate.setHours(0, 0, 0, 0)
  const dayOfWeek = baseDate.getDay()
  const offsetToThursday = (4 - dayOfWeek + 7) % 7
  const startDate = new Date(baseDate)
  startDate.setDate(startDate.getDate() + offsetToThursday)
  const startIsoDate = startDate.toISOString().split('T')[0]
  const startIso = `${startIsoDate}T00:00:00.000Z`

  await createScheduledItem(page, calendar.id, {
    layerKey: 'reference',
    date: startIso,
    title: 'Week Bridge Event',
    durationDays: 5,
  })
  await createScheduledItem(page, calendar.id, {
    layerKey: 'reference',
    date: startIso,
    title: 'Week Bridge Event 2',
    durationDays: 4,
  })

  await page.reload()
  await selectCalendarByName(page, 'Multi Span Calendar')

  const eventButton = page.getByRole('button', { name: 'Week Bridge Event' }).first()
  await expect(eventButton).toBeVisible()

  const startCell = page.locator(`[data-date="${startIsoDate}"]`)
  await expect(startCell).toBeVisible()
  const cellBox = await startCell.boundingBox()
  const eventBox = await eventButton.boundingBox()
  expect(cellBox).not.toBeNull()
  expect(eventBox).not.toBeNull()
  expect(eventBox!.width).toBeGreaterThan((cellBox!.width ?? 0) * 1.5)

  const saturdayDate = new Date(startDate)
  saturdayDate.setDate(startDate.getDate() + 2)
  const saturdayIso = saturdayDate.toISOString().split('T')[0]
  const saturdayCell = page.locator(`[data-date="${saturdayIso}"]`)
  await expect(
    saturdayCell.locator(`button:has-text("Week Bridge Event")`)
  ).toHaveCount(0)
  await expect(saturdayCell.locator('[data-testid="blocked-gap"]')).toHaveCount(2)

  const sundayDate = new Date(startDate)
  sundayDate.setDate(startDate.getDate() + 3)
  const sundayIso = sundayDate.toISOString().split('T')[0]
  const sundayCell = page.locator(`[data-date="${sundayIso}"]`)
  await expect(
    sundayCell.locator(`button:has-text("Week Bridge Event")`)
  ).toHaveCount(0)
  await expect(sundayCell.locator('[data-testid="blocked-gap"]')).toHaveCount(2)

  const mondayDate = new Date(startDate)
  mondayDate.setDate(startDate.getDate() + 4)
  const mondayIso = mondayDate.toISOString().split('T')[0]
  const mondayContinuation = page.locator(
    `[data-date="${mondayIso}"] button:has-text("Week Bridge Event")`
  )
  await expect(mondayContinuation.first()).toBeVisible()

  const exceptionResponse = await page.request.patch(
    `${API_BASE_URL}/calendars/${calendar.id}/exceptions`,
    {
      data: {
        addEntries: [
          {
            date: mondayIso,
            title: 'Mid Break',
            targetLayerKeys: ['reference'],
          },
        ],
      },
    }
  )
  expect(exceptionResponse.ok()).toBeTruthy()

  await page.reload()
  await selectCalendarByName(page, 'Multi Span Calendar')

  const mondayCell = page.locator(`[data-date="${mondayIso}"]`)
  await expect(mondayCell.locator(`button:has-text("Week Bridge Event")`)).toHaveCount(0)

  const saturdayCellAfter = page.locator(`[data-date="${saturdayIso}"]`)
  await expect(saturdayCellAfter.locator('[data-testid="blocked-gap"]')).toHaveCount(2)

  const tuesdayDate = new Date(mondayDate)
  tuesdayDate.setDate(tuesdayDate.getDate() + 1)
  const tuesdayIso = tuesdayDate.toISOString().split('T')[0]
  await expect(
    page.locator(`[data-date="${tuesdayIso}"] button:has-text("Week Bridge Event")`).first()
  ).toBeVisible()
  await expect(
    page.locator(`[data-date="${tuesdayIso}"] button:has-text("Week Bridge Event 2")`).first()
  ).toBeVisible()
})

