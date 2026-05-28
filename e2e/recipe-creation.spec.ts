import { test, expect } from '@playwright/test'
import { uniqueId } from './helpers'

// Runs in the `authed` project (shared session loaded from storageState).
test('create a recipe through the form', async ({ page }) => {
  const title = uniqueId('E2E Pancakes')

  await page.goto('/recipes/new')
  await expect(page.getByRole('heading', { name: 'New recipe' })).toBeVisible()

  await page.locator('#title').fill(title)
  await page.locator('#description').fill('Fluffy weekend pancakes')
  await page.locator('#cookTime').fill('20')
  await page.locator('#servings').fill('4')

  // Tags: type and commit with Enter
  await page.getByPlaceholder('dessert, quick, vegetarian…').fill('breakfast')
  await page.getByPlaceholder('dessert, quick, vegetarian…').press('Enter')
  await expect(page.getByRole('button', { name: 'Remove breakfast' })).toBeVisible()

  // First ingredient row
  await page.getByLabel('Ingredient 1 amount').fill('200')
  await page.getByLabel('Ingredient 1 unit').fill('g')
  await page.getByLabel('Ingredient 1 name').fill('flour')

  // First step (exact: avoid matching the "Remove step 1" button)
  await page.getByLabel('Step 1', { exact: true }).fill('Whisk the batter and cook on a hot griddle')

  await page.getByRole('button', { name: 'Create recipe' }).click()

  // On success the form navigates back to the grid, where the new recipe shows up
  await expect(page).toHaveURL('/')
  await expect(page.getByText(title)).toBeVisible()
})
