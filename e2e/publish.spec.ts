import { test, expect } from '@playwright/test'
import { seedRecipe } from './helpers'

// Runs in the `authed` project (shared session loaded from storageState).
test('publish a recipe and reveal its public link', async ({ page, context, request }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])

  const recipe = await seedRecipe(request, { title: 'Publishable Stew' })

  await page.goto(`/recipes/${recipe.id}`)
  await expect(page.getByRole('heading', { name: 'Publishable Stew' })).toBeVisible()

  const toggle = page.getByRole('switch', { name: 'Toggle public sharing' })
  await expect(toggle).toHaveAttribute('aria-checked', 'false')

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'true')

  // Public URL surfaces with a generated slug
  const urlInput = page.getByLabel('Public recipe URL')
  await expect(urlInput).toBeVisible()
  await expect(urlInput).toHaveValue(/\/r\/[A-Za-z0-9_-]+$/)

  // Copy button confirms the copy action
  await page.getByRole('button', { name: 'Copy' }).click()
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible()
})
