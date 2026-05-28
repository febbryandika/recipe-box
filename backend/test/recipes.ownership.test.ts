import { afterEach, beforeAll, describe, expect, it } from 'bun:test'
import {
  app,
  authedJson,
  createUserSession,
  imageFile,
  json,
  makeRecipePayload,
  resetDb,
  type RecipeRow,
} from './helpers'

// A recipe owned by user A must be invisible to user B across every endpoint —
// the API returns 404 (not 403) so it never even confirms the recipe exists.
describe('recipe ownership validation', () => {
  beforeAll(async () => {
    await resetDb()
  })

  afterEach(async () => {
    await resetDb()
  })

  async function setup() {
    const alice = await createUserSession({ name: 'Alice' })
    const bob = await createUserSession({ name: 'Bob' })
    const recipe = await json<RecipeRow>(
      await authedJson(alice.cookie, '/api/recipes', {
        method: 'POST',
        body: makeRecipePayload({ title: "Alice's secret" }),
      }),
    )
    return { alice, bob, recipe }
  }

  it('hides another user recipe from GET /:id', async () => {
    const { bob, recipe } = await setup()
    const res = await authedJson(bob.cookie, `/api/recipes/${recipe.id}`)
    expect(res.status).toBe(404)
  })

  it('blocks PUT /:id by a non-owner', async () => {
    const { bob, recipe } = await setup()
    const res = await authedJson(bob.cookie, `/api/recipes/${recipe.id}`, {
      method: 'PUT',
      body: makeRecipePayload({ title: 'hijacked' }),
    })
    expect(res.status).toBe(404)
  })

  it('blocks DELETE /:id by a non-owner', async () => {
    const { alice, bob, recipe } = await setup()
    const res = await authedJson(bob.cookie, `/api/recipes/${recipe.id}`, { method: 'DELETE' })
    expect(res.status).toBe(404)

    // The recipe still exists for its owner.
    const stillThere = await authedJson(alice.cookie, `/api/recipes/${recipe.id}`)
    expect(stillThere.status).toBe(200)
  })

  it('blocks POST /:id/share by a non-owner', async () => {
    const { bob, recipe } = await setup()
    const res = await authedJson(bob.cookie, `/api/recipes/${recipe.id}/share`, { method: 'POST' })
    expect(res.status).toBe(404)
  })

  it('blocks POST /:id/cover by a non-owner', async () => {
    const { bob, recipe } = await setup()
    const form = new FormData()
    form.append('file', imageFile('image/png'))
    const res = await app.request(`/api/recipes/${recipe.id}/cover`, {
      method: 'POST',
      headers: { Cookie: bob.cookie },
      body: form,
    })
    expect(res.status).toBe(404)
  })

  it('excludes other users recipes from the list', async () => {
    const { bob } = await setup()
    const res = await authedJson(bob.cookie, '/api/recipes')
    expect(res.status).toBe(200)
    expect(await res.json()).toHaveLength(0)
  })
})
