import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import { recipes } from '../db/schema'

const slugParamSchema = z.object({
  slug : z.string().min(1),
})

const onInvalid = (result: { success: boolean; error?: z.ZodError }, c: any) => {
  if (!result.success) {
    return c.json({ error: 'Invalid input', details: result.error!.flatten() }, 400)
  }
}

export const publicRoute = new Hono()
  .get('/:slug', zValidator('param', slugParamSchema, onInvalid), async (c) => {
    const { slug } = c.req.valid('param')

    const [row] = await db
      .select({
        id              : recipes.id,
        title           : recipes.title,
        description     : recipes.description,
        coverImageUrl   : recipes.coverImageUrl,
        cookTimeMinutes : recipes.cookTimeMinutes,
        servings        : recipes.servings,
        ingredientsJson : recipes.ingredientsJson,
        stepsJson       : recipes.stepsJson,
        tags            : recipes.tags,
        createdAt       : recipes.createdAt,
      })
      .from(recipes)
      .where(and(eq(recipes.publicSlug, slug), eq(recipes.isPublic, true)))
      .limit(1)

    if (!row) return c.json({ error: 'Recipe not found' }, 404)
    return c.json(row)
  })
