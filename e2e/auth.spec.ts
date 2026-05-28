import { test, expect } from '@playwright/test'
import { TEST_PASSWORD, uniqueEmail } from './helpers'

// Runs in the `anon` project (no stored session) so it exercises the real
// sign-up + sign-in UI end to end.
test('user can sign up and then sign back in', async ({ page, context }) => {
  const email = uniqueEmail()

  // Sign up
  await page.goto('/login')
  await page.getByRole('button', { name: 'Sign up' }).click()
  await page.locator('#name').fill('Login Flow User')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()

  // Lands on the authenticated home grid
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'My Recipes' })).toBeVisible()

  // Drop the session and sign in again with the same credentials
  await context.clearCookies()
  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'My Recipes' })).toBeVisible()
})
