import { test, expect } from '@playwright/test'
import { FRONTEND_URL, publishRecipe, seedRecipe } from './helpers'

// Seeds + publishes via the authed API, then views the public page in a fresh,
// unauthenticated browser context to prove no auth is required.
test('a published recipe is readable without logging in', async ({ browser, request }) => {
  const recipe = await seedRecipe(request, {
    title: 'Public Lemon Tart',
    ingredients: [{ amount: '3', unit: 'whole', name: 'lemons' }],
    steps: ['Zest and juice the lemons'],
    tags: ['dessert'],
  })
  const { publicSlug } = await publishRecipe(request, recipe.id)

  const anonContext = await browser.newContext()
  try {
    const anonPage = await anonContext.newPage()
    await anonPage.goto(`${FRONTEND_URL}/r/${publicSlug}`)

    await expect(anonPage).toHaveURL(new RegExp(`/r/${publicSlug}$`))
    await expect(anonPage.getByRole('heading', { name: 'Public Lemon Tart' })).toBeVisible()
    await expect(anonPage.getByRole('heading', { name: 'Ingredients' })).toBeVisible()
    await expect(anonPage.getByText('lemons', { exact: true })).toBeVisible()
    await expect(anonPage.getByRole('heading', { name: 'Steps' })).toBeVisible()
    await expect(anonPage.getByText('Zest and juice the lemons')).toBeVisible()
  } finally {
    await anonContext.close()
  }
})

test('an unknown slug shows the not-found state', async ({ browser }) => {
  const anonContext = await browser.newContext()
  try {
    const anonPage = await anonContext.newPage()
    await anonPage.goto(`${FRONTEND_URL}/r/does-not-exist-xyz`)
    // The query retries (react-query default backoff ~7s) before settling to not-found.
    await expect(anonPage.getByText('Recipe not found')).toBeVisible({ timeout: 15_000 })
  } finally {
    await anonContext.close()
  }
})
