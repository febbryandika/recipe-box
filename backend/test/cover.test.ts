import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import {
  app,
  authedJson,
  createUserSession,
  imageFile,
  json,
  makeRecipePayload,
  r2Calls,
  resetDb,
  type RecipeRow,
  type TestUser,
} from './helpers'

const MB = 1024 * 1024

// R2 is mocked (see test/setup.ts): uploadCover returns a deterministic URL and
// records calls; deleteCoverByUrl records the URLs it was asked to remove.
describe('cover image upload', () => {
  beforeAll(async () => {
    await resetDb()
  })

  beforeEach(() => {
    r2Calls.uploads.length = 0
    r2Calls.deletes.length = 0
  })

  afterEach(async () => {
    await resetDb()
  })

  async function ownerWithRecipe(): Promise<{ user: TestUser; recipeId: string }> {
    const user = await createUserSession()
    const recipe = await json<RecipeRow>(
      await authedJson(user.cookie, '/api/recipes', { method: 'POST', body: makeRecipePayload() }),
    )
    return { user, recipeId: recipe.id }
  }

  function uploadCover(cookie: string, recipeId: string, file: File) {
    const form = new FormData()
    form.append('file', file)
    return app.request(`/api/recipes/${recipeId}/cover`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: form,
    })
  }

  it('uploads a valid image and stores the returned URL', async () => {
    const { user, recipeId } = await ownerWithRecipe()
    const res = await uploadCover(user.cookie, recipeId, imageFile('image/png'))
    expect(res.status).toBe(200)

    const updated = await json<RecipeRow>(res)
    expect(updated.coverImageUrl).toBe('http://localhost:3000/api/covers/test-cover.png')
    expect(r2Calls.uploads).toHaveLength(1)
    expect(r2Calls.uploads[0].contentType).toBe('image/png')
  })

  it('rejects an unsupported MIME type with 400', async () => {
    const { user, recipeId } = await ownerWithRecipe()
    const res = await uploadCover(user.cookie, recipeId, imageFile('text/plain'))
    expect(res.status).toBe(400)
    expect(r2Calls.uploads).toHaveLength(0)
  })

  it('rejects a file over 5MB with 413', async () => {
    const { user, recipeId } = await ownerWithRecipe()
    const res = await uploadCover(user.cookie, recipeId, imageFile('image/png', 5 * MB + 1))
    expect(res.status).toBe(413)
    expect(r2Calls.uploads).toHaveLength(0)
  })

  it('rejects a request with no file field with 400', async () => {
    const { user, recipeId } = await ownerWithRecipe()
    const form = new FormData()
    form.append('file', 'not-a-file')
    const res = await app.request(`/api/recipes/${recipeId}/cover`, {
      method: 'POST',
      headers: { Cookie: user.cookie },
      body: form,
    })
    expect(res.status).toBe(400)
    expect(r2Calls.uploads).toHaveLength(0)
  })

  it('deletes the old cover from R2 when the recipe is deleted', async () => {
    const { user, recipeId } = await ownerWithRecipe()
    await uploadCover(user.cookie, recipeId, imageFile('image/png'))
    const url = 'http://localhost:3000/api/covers/test-cover.png'

    const del = await authedJson(user.cookie, `/api/recipes/${recipeId}`, { method: 'DELETE' })
    expect(del.status).toBe(204)
    expect(r2Calls.deletes).toContain(url)
  })
})
