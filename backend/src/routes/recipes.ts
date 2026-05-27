import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { and, arrayContains, desc, eq, ilike } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../db'
import { recipes } from '../db/schema'
import type { AppVariables } from '../lib/middleware'

const ingredientSchema = z.object({
  amount : z.string().min(1),
  unit   : z.string().min(1),
  name   : z.string().min(1),
})

const recipeBodySchema = z.object({
  title           : z.string().min(1),
  description     : z.string().nullable().optional(),
  coverImageUrl   : z.string().url().nullable().optional(),
  cookTimeMinutes : z.number().int().positive().nullable().optional(),
  servings        : z.number().int().positive().nullable().optional(),
  ingredients     : z.array(ingredientSchema),
  steps           : z.array(z.string()),
  tags            : z.array(z.string()),
})

const listQuerySchema = z.object({
  search : z.string().min(1).optional(),
  tag    : z.string().min(1).optional(),
})

const idParamSchema = z.object({
  id : z.string().min(1),
})

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
      .returning({ id: recipes.id })

    if (!deleted) return c.json({ error: 'Recipe not found' }, 404)
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
    const slug = existing.publicSlug ?? nanoid(12)

    const [updated] = await db
      .update(recipes)
      .set({ isPublic: nextIsPublic, publicSlug: slug, updatedAt: new Date() })
      .where(and(eq(recipes.id, id), eq(recipes.userId, userId)))
      .returning({ isPublic: recipes.isPublic, publicSlug: recipes.publicSlug })

    return c.json(updated)
  })
