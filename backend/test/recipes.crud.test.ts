import { afterEach, beforeAll, describe, expect, it } from 'bun:test'
import {
  app,
  authedJson,
  createUserSession,
  json,
  makeRecipePayload,
  resetDb,
  type RecipeRow,
  type TestUser,
} from './helpers'

describe('authenticated recipe CRUD', () => {
  beforeAll(async () => {
    await resetDb()
  })

  afterEach(async () => {
    await resetDb()
  })

  // resetDb wipes users between tests, so each test gets a fresh session.
  function freshUser(): Promise<TestUser> {
    return createUserSession()
  }

  describe('auth guard', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await app.request('/api/recipes')
      expect(res.status).toBe(401)
    })
  })

  describe('create', () => {
    it('creates a recipe and returns 201 with the persisted shape', async () => {
      const { cookie, user: u } = await freshUser()
      const payload = makeRecipePayload()

      const res = await authedJson(cookie, '/api/recipes', { method: 'POST', body: payload })
      expect(res.status).toBe(201)

      const created = await json<RecipeRow>(res)
      expect(created.id).toBeString()
      expect(created.userId).toBe(u.id)
      expect(created.title).toBe(payload.title)
      expect(created.ingredientsJson).toEqual(payload.ingredients)
      expect(created.stepsJson).toEqual(payload.steps)
      expect(created.tags).toEqual(payload.tags)
      expect(created.isPublic).toBe(false)
      expect(created.publicSlug).toBeNull()
    })

    it('rejects an empty title with 400', async () => {
      const { cookie } = await freshUser()
      const res = await authedJson(cookie, '/api/recipes', {
        method: 'POST',
        body: makeRecipePayload({ title: '' }),
      })
      expect(res.status).toBe(400)
    })

    it('rejects non-positive cookTime and servings with 400', async () => {
      const { cookie } = await freshUser()

      const zeroCook = await authedJson(cookie, '/api/recipes', {
        method: 'POST',
        body: makeRecipePayload({ cookTimeMinutes: 0 }),
      })
      expect(zeroCook.status).toBe(400)

      const negServings = await authedJson(cookie, '/api/recipes', {
        method: 'POST',
        body: makeRecipePayload({ servings: -1 }),
      })
      expect(negServings.status).toBe(400)
    })
  })

  describe('list / search / tag filter', () => {
    it('lists only the user own recipes, newest first', async () => {
      const { cookie } = await freshUser()
      await authedJson(cookie, '/api/recipes', {
        method: 'POST',
        body: makeRecipePayload({ title: 'First' }),
      })
      await authedJson(cookie, '/api/recipes', {
        method: 'POST',
        body: makeRecipePayload({ title: 'Second' }),
      })

      const res = await authedJson(cookie, '/api/recipes')
      expect(res.status).toBe(200)
      const rows = await json<RecipeRow[]>(res)
      expect(rows).toHaveLength(2)
      expect(rows[0].title).toBe('Second') // ordered by updatedAt desc
      expect(rows[1].title).toBe('First')
    })

    it('filters by title with ILIKE (case-insensitive)', async () => {
      const { cookie } = await freshUser()
      await authedJson(cookie, '/api/recipes', {
        method: 'POST',
        body: makeRecipePayload({ title: 'Chicken Curry' }),
      })
      await authedJson(cookie, '/api/recipes', {
        method: 'POST',
        body: makeRecipePayload({ title: 'Beef Stew' }),
      })

      const res = await authedJson(cookie, '/api/recipes?search=curry')
      const rows = await json<RecipeRow[]>(res)
      expect(rows).toHaveLength(1)
      expect(rows[0].title).toBe('Chicken Curry')
    })

    it('filters by tag membership', async () => {
      const { cookie } = await freshUser()
      await authedJson(cookie, '/api/recipes', {
        method: 'POST',
        body: makeRecipePayload({ title: 'Vegan Bowl', tags: ['vegan', 'healthy'] }),
      })
      await authedJson(cookie, '/api/recipes', {
        method: 'POST',
        body: makeRecipePayload({ title: 'Steak', tags: ['meat'] }),
      })

      const res = await authedJson(cookie, '/api/recipes?tag=vegan')
      const rows = await json<RecipeRow[]>(res)
      expect(rows).toHaveLength(1)
      expect(rows[0].title).toBe('Vegan Bowl')
    })

    it('combines search and tag filters', async () => {
      const { cookie } = await freshUser()
      await authedJson(cookie, '/api/recipes', {
        method: 'POST',
        body: makeRecipePayload({ title: 'Vegan Curry', tags: ['vegan'] }),
      })
      await authedJson(cookie, '/api/recipes', {
        method: 'POST',
        body: makeRecipePayload({ title: 'Vegan Salad', tags: ['vegan'] }),
      })

      const res = await authedJson(cookie, '/api/recipes?search=curry&tag=vegan')
      const rows = await json<RecipeRow[]>(res)
      expect(rows).toHaveLength(1)
      expect(rows[0].title).toBe('Vegan Curry')
    })
  })

  describe('read / update / delete', () => {
    it('gets a single owned recipe', async () => {
      const { cookie } = await freshUser()
      const created = await json<RecipeRow>(
        await authedJson(cookie, '/api/recipes', { method: 'POST', body: makeRecipePayload() }),
      )

      const res = await authedJson(cookie, `/api/recipes/${created.id}`)
      expect(res.status).toBe(200)
      expect((await json<RecipeRow>(res)).id).toBe(created.id)
    })

    it('returns 404 for a missing recipe id', async () => {
      const { cookie } = await freshUser()
      const res = await authedJson(cookie, '/api/recipes/does-not-exist')
      expect(res.status).toBe(404)
    })

    it('replaces ingredients and steps wholesale on update', async () => {
      const { cookie } = await freshUser()
      const created = await json<RecipeRow>(
        await authedJson(cookie, '/api/recipes', { method: 'POST', body: makeRecipePayload() }),
      )

      const updatedPayload = makeRecipePayload({
        title: 'Updated Title',
        ingredients: [{ amount: '1', unit: 'cup', name: 'rice' }],
        steps: ['Cook rice'],
        tags: ['rice'],
      })
      const res = await authedJson(cookie, `/api/recipes/${created.id}`, {
        method: 'PUT',
        body: updatedPayload,
      })
      expect(res.status).toBe(200)

      const updated = await json<RecipeRow>(res)
      expect(updated.title).toBe('Updated Title')
      expect(updated.ingredientsJson).toEqual(updatedPayload.ingredients)
      expect(updated.stepsJson).toEqual(updatedPayload.steps)
      expect(updated.tags).toEqual(['rice'])
    })

    it('deletes an owned recipe and returns 204', async () => {
      const { cookie } = await freshUser()
      const created = await json<RecipeRow>(
        await authedJson(cookie, '/api/recipes', { method: 'POST', body: makeRecipePayload() }),
      )

      const del = await authedJson(cookie, `/api/recipes/${created.id}`, { method: 'DELETE' })
      expect(del.status).toBe(204)

      const get = await authedJson(cookie, `/api/recipes/${created.id}`)
      expect(get.status).toBe(404)
    })
  })
})
