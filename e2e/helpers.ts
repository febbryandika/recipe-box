import { expect, type APIRequestContext } from '@playwright/test'

// E2E talks to the two dev servers Playwright boots (see playwright.config.ts).
// API requests target the backend directly; the session cookie is host-only for
// `localhost`, so it is sent to :3000 regardless of the page's port.
export const BACKEND_URL = 'http://localhost:3100'
export const FRONTEND_URL = 'http://localhost:4173'

let counter = 0

// The E2E backend uses one in-process PGlite DB shared across a run with no
// per-test reset, so every test must use its own unique data.
export function uniqueId(prefix: string): string {
  counter += 1
  return `${prefix}-${Date.now()}-${counter}`
}

export function uniqueEmail(): string {
  return `${uniqueId('e2e-user')}@test.dev`
}

export const TEST_PASSWORD = 'password-12345'

export type Ingredient = { amount: string; unit: string; name: string }

export type RecipeRow = {
  id: string
  title: string
  description: string | null
  cookTimeMinutes: number | null
  servings: number | null
  ingredientsJson: Ingredient[]
  stepsJson: string[]
  tags: string[]
  isPublic: boolean
  publicSlug: string | null
}

type SeedOverrides = Partial<{
  title: string
  description: string | null
  cookTimeMinutes: number | null
  servings: number | null
  ingredients: Ingredient[]
  steps: string[]
  tags: string[]
}>

// Create a recipe via the API using the caller's stored session cookie. Used to set
// up state for the publish and public-access flows without driving the create form.
export async function seedRecipe(
  request: APIRequestContext,
  overrides: SeedOverrides = {},
): Promise<RecipeRow> {
  const res = await request.post(`${BACKEND_URL}/api/recipes`, {
    headers: { origin: FRONTEND_URL },
    data: {
      title: overrides.title ?? uniqueId('Seeded Recipe'),
      description: overrides.description ?? 'Seeded for E2E',
      cookTimeMinutes: overrides.cookTimeMinutes ?? 25,
      servings: overrides.servings ?? 3,
      ingredients: overrides.ingredients ?? [{ amount: '2', unit: 'cups', name: 'flour' }],
      steps: overrides.steps ?? ['Mix everything', 'Bake until golden'],
      tags: overrides.tags ?? ['e2e'],
    },
  })
  expect(res.ok(), `seedRecipe failed: ${res.status()} ${await res.text()}`).toBeTruthy()
  return res.json()
}

export async function publishRecipe(
  request: APIRequestContext,
  id: string,
): Promise<{ isPublic: boolean; publicSlug: string }> {
  const res = await request.post(`${BACKEND_URL}/api/recipes/${id}/share`, {
    headers: { origin: FRONTEND_URL },
  })
  expect(res.ok(), `publishRecipe failed: ${res.status()} ${await res.text()}`).toBeTruthy()
  return res.json()
}
