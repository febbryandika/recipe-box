import { test, expect } from '@playwright/test'
import { uniqueId } from './helpers'

// Runs in the `authed` project. Each test gets a fresh browser context, so the
// draft written here does not leak into the recipe-creation spec.
test('draft autosaves and is restored after a reload', async ({ page }) => {
  const title = uniqueId('Draft Bread')

  await page.goto('/recipes/new')
  await page.locator('#title').fill(title)

  // Autosave debounces ~1s, then the indicator reports a saved draft
  await expect(page.getByText('Draft saved')).toBeVisible()

  await page.reload()

  // Field is repopulated and the restore banner appears
  await expect(page.locator('#title')).toHaveValue(title)
  await expect(page.getByText('Draft restored from your last session.')).toBeVisible()

  // Discarding clears the field and dismisses the banner
  await page.getByRole('button', { name: 'Discard' }).click()
  await expect(page.locator('#title')).toHaveValue('')
  await expect(page.getByText('Draft restored from your last session.')).toBeHidden()
})
