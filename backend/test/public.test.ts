import { afterEach, beforeAll, describe, expect, it } from 'bun:test'
import {
  app,
  authedJson,
  createUserSession,
  json,
  makeRecipePayload,
  resetDb,
  type PublicRecipe,
  type RecipeRow,
  type ShareResult,
} from './helpers'

// The public endpoint is unauthenticated and only serves recipes that have been
// shared. It must expose a read-only subset and never leak ownership fields.
describe('public recipe endpoint', () => {
  beforeAll(async () => {
    await resetDb()
  })

  afterEach(async () => {
    await resetDb()
  })

  async function createSharedRecipe() {
    const owner = await createUserSession()
    const recipe = await json<RecipeRow>(
      await authedJson(owner.cookie, '/api/recipes', {
        method: 'POST',
        body: makeRecipePayload({ title: 'Public Pasta' }),
      }),
    )
    const share = await json<ShareResult>(
      await authedJson(owner.cookie, `/api/recipes/${recipe.id}/share`, { method: 'POST' }),
    )
    return { owner, recipe, share }
  }

  it('shares a recipe, generating a 12-char slug', async () => {
    const { share } = await createSharedRecipe()
    expect(share.isPublic).toBe(true)
    expect(share.publicSlug).toBeString()
    expect(share.publicSlug).toHaveLength(12)
  })

  it('serves a shared recipe without authentication', async () => {
    const { share } = await createSharedRecipe()
    const res = await app.request(`/api/public/${share.publicSlug}`)
    expect(res.status).toBe(200)
    const body = await json<PublicRecipe>(res)
    expect(body.title).toBe('Public Pasta')
    expect(body.ingredientsJson).toBeArray()
    expect(body.stepsJson).toBeArray()
  })

  it('exposes only the public subset of fields', async () => {
    const { share } = await createSharedRecipe()
    const body = await json<Record<string, unknown>>(
      await app.request(`/api/public/${share.publicSlug}`),
    )

    const allowed = [
      'id',
      'title',
      'description',
      'coverImageUrl',
      'cookTimeMinutes',
      'servings',
      'ingredientsJson',
      'stepsJson',
      'tags',
      'createdAt',
    ].sort()
    expect(Object.keys(body).sort()).toEqual(allowed)

    // Ownership / internal fields must never be exposed.
    expect(body).not.toHaveProperty('userId')
    expect(body).not.toHaveProperty('isPublic')
    expect(body).not.toHaveProperty('publicSlug')
    expect(body).not.toHaveProperty('updatedAt')
  })

  it('returns 404 for an unknown slug', async () => {
    const res = await app.request('/api/public/nonexistentslug')
    expect(res.status).toBe(404)
  })

  it('returns 404 for a private (un-shared) recipe', async () => {
    const owner = await createUserSession()
    const recipe = await json<RecipeRow>(
      await authedJson(owner.cookie, '/api/recipes', { method: 'POST', body: makeRecipePayload() }),
    )
    // Recipe exists but was never shared — it has no public slug and isPublic=false.
    expect(recipe.publicSlug).toBeNull()
    const res = await app.request(`/api/public/${recipe.id}`)
    expect(res.status).toBe(404)
  })

  it('stops serving after sharing is toggled off, but reuses the same slug', async () => {
    const { owner, recipe, share } = await createSharedRecipe()
    const slug = share.publicSlug

    // Toggle off.
    const off = await json<ShareResult>(
      await authedJson(owner.cookie, `/api/recipes/${recipe.id}/share`, { method: 'POST' }),
    )
    expect(off.isPublic).toBe(false)
    expect(off.publicSlug).toBe(slug) // slug is preserved

    const whileOff = await app.request(`/api/public/${slug}`)
    expect(whileOff.status).toBe(404)

    // Toggle back on — same slug returns.
    const on = await json<ShareResult>(
      await authedJson(owner.cookie, `/api/recipes/${recipe.id}/share`, { method: 'POST' }),
    )
    expect(on.isPublic).toBe(true)
    expect(on.publicSlug).toBe(slug)

    const whileOn = await app.request(`/api/public/${slug}`)
    expect(whileOn.status).toBe(200)
  })
})
