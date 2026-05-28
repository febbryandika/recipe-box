import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { and, arrayContains, desc, eq, ilike } from 'drizzle-orm'
import { db } from '../db'
import { recipes } from '../db/schema'
import { deleteCoverByUrl, uploadCover } from '../lib/r2'
import { logger, serializeError } from '../lib/logger'
import { resolveSlug } from '../lib/slug'
import {
  idParamSchema,
  listQuerySchema,
  recipeBodySchema,
} from '../lib/recipe-validation'
import type { AppVariables } from '../lib/middleware'

const MAX_COVER_BYTES = 5 * 1024 * 1024
const ALLOWED_COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const EXT_BY_MIME: Record<(typeof ALLOWED_COVER_TYPES)[number], string> = {
  'image/jpeg': 'jpg',
  'image/png' : 'png',
  'image/webp': 'webp',
}

const onInvalid = (result: { success: boolean; error?: z.ZodError }, c: any) => {
  if (!result.success) {
    return c.json({ error: 'Invalid input', details: result.error!.flatten() }, 400)
  }
}

export const recipesRoute = new Hono<{ Variables: AppVariables }>()
  .get('/', zValidator('query', listQuerySchema, onInvalid), async (c) => {
    const userId = c.get('user').id
    const { search, tag } = c.req.valid('query')

    const conditions = [eq(recipes.userId, userId)]
    if (search) conditions.push(ilike(recipes.title, `%${search}%`))
    if (tag) conditions.push(arrayContains(recipes.tags, [tag]))

    const rows = await db
      .select()
      .from(recipes)
      .where(and(...conditions))
      .orderBy(desc(recipes.updatedAt))

    return c.json(rows)
  })
  .post('/', zValidator('json', recipeBodySchema, onInvalid), async (c) => {
    const userId = c.get('user').id
    const body = c.req.valid('json')

    const [created] = await db
      .insert(recipes)
      .values({
        userId,
        title           : body.title,
        description     : body.description ?? null,
        coverImageUrl   : body.coverImageUrl ?? null,
        cookTimeMinutes : body.cookTimeMinutes ?? null,
        servings        : body.servings ?? null,
        ingredientsJson : body.ingredients,
        stepsJson       : body.steps,
        tags            : body.tags,
      })
      .returning()

    return c.json(created, 201)
  })
  .get('/:id', zValidator('param', idParamSchema, onInvalid), async (c) => {
    const userId = c.get('user').id
    const { id } = c.req.valid('param')

    const [row] = await db
      .select()
      .from(recipes)
      .where(and(eq(recipes.id, id), eq(recipes.userId, userId)))
      .limit(1)

    if (!row) return c.json({ error: 'Recipe not found' }, 404)
    return c.json(row)
  })
  .put(
    '/:id',
    zValidator('param', idParamSchema, onInvalid),
    zValidator('json', recipeBodySchema, onInvalid),
    async (c) => {
      const userId = c.get('user').id
      const { id } = c.req.valid('param')
      const body = c.req.valid('json')

      const [updated] = await db
        .update(recipes)
        .set({
          title           : body.title,
          description     : body.description ?? null,
          coverImageUrl   : body.coverImageUrl ?? null,
          cookTimeMinutes : body.cookTimeMinutes ?? null,
          servings        : body.servings ?? null,
          ingredientsJson : body.ingredients,
          stepsJson       : body.steps,
          tags            : body.tags,
          updatedAt       : new Date(),
        })
        .where(and(eq(recipes.id, id), eq(recipes.userId, userId)))
        .returning()

      if (!updated) return c.json({ error: 'Recipe not found' }, 404)
      return c.json(updated)
    },
  )
  .delete('/:id', zValidator('param', idParamSchema, onInvalid), async (c) => {
    const userId = c.get('user').id
    const { id } = c.req.valid('param')

    const [deleted] = await db
      .delete(recipes)
      .where(and(eq(recipes.id, id), eq(recipes.userId, userId)))
      .returning({ id: recipes.id, coverImageUrl: recipes.coverImageUrl })

    if (!deleted) return c.json({ error: 'Recipe not found' }, 404)

    if (deleted.coverImageUrl) {
      await deleteCoverByUrl(deleted.coverImageUrl)
    }

    return c.body(null, 204)
  })
  .post('/:id/share', zValidator('param', idParamSchema, onInvalid), async (c) => {
    const userId = c.get('user').id
    const { id } = c.req.valid('param')

    const [existing] = await db
      .select({ isPublic: recipes.isPublic, publicSlug: recipes.publicSlug })
      .from(recipes)
      .where(and(eq(recipes.id, id), eq(recipes.userId, userId)))
      .limit(1)

    if (!existing) return c.json({ error: 'Recipe not found' }, 404)

    const nextIsPublic = !existing.isPublic
    const slug = resolveSlug(existing.publicSlug)

    const [updated] = await db
      .update(recipes)
      .set({ isPublic: nextIsPublic, publicSlug: slug, updatedAt: new Date() })
      .where(and(eq(recipes.id, id), eq(recipes.userId, userId)))
      .returning({ isPublic: recipes.isPublic, publicSlug: recipes.publicSlug })

    return c.json(updated)
  })
  .post('/:id/cover', zValidator('param', idParamSchema, onInvalid), async (c) => {
    const userId = c.get('user').id
    const { id } = c.req.valid('param')

    const [existing] = await db
      .select({ id: recipes.id, coverImageUrl: recipes.coverImageUrl })
      .from(recipes)
      .where(and(eq(recipes.id, id), eq(recipes.userId, userId)))
      .limit(1)

    if (!existing) return c.json({ error: 'Recipe not found' }, 404)

    let body: Record<string, unknown>
    try {
      body = await c.req.parseBody()
    } catch {
      return c.json({ error: 'Invalid multipart body' }, 400)
    }

    const file = body['file']
    if (!(file instanceof File)) {
      return c.json({ error: 'No file provided' }, 400)
    }

    if (!(ALLOWED_COVER_TYPES as readonly string[]).includes(file.type)) {
      return c.json(
        { error: 'Unsupported image type', allowed: ALLOWED_COVER_TYPES },
        400,
      )
    }

    if (file.size > MAX_COVER_BYTES) {
      return c.json({ error: 'Image exceeds 5MB limit' }, 413)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = EXT_BY_MIME[file.type as (typeof ALLOWED_COVER_TYPES)[number]]

    if (existing.coverImageUrl) {
      await deleteCoverByUrl(existing.coverImageUrl)
    }

    let uploaded: { url: string }
    try {
      uploaded = await uploadCover(buffer, file.type, ext)
    } catch (err) {
      logger.error('cover upload failed', {
        requestId : c.get('requestId'),
        recipeId  : id,
        userId,
        err       : serializeError(err),
      })
      return c.json({ error: 'Upload failed' }, 500)
    }

    const [updated] = await db
      .update(recipes)
      .set({ coverImageUrl: uploaded.url, updatedAt: new Date() })
      .where(and(eq(recipes.id, id), eq(recipes.userId, userId)))
      .returning()

    return c.json(updated)
  })
