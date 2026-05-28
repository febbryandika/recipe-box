import { z } from 'zod'

export const ingredientSchema = z.object({
  amount : z.string().min(1),
  unit   : z.string().min(1),
  name   : z.string().min(1),
})

export const recipeBodySchema = z.object({
  title           : z.string().min(1),
  description     : z.string().nullable().optional(),
  coverImageUrl   : z.string().url().nullable().optional(),
  cookTimeMinutes : z.number().int().positive().nullable().optional(),
  servings        : z.number().int().positive().nullable().optional(),
  ingredients     : z.array(ingredientSchema),
  steps           : z.array(z.string()),
  tags            : z.array(z.string()),
})

export const listQuerySchema = z.object({
  search : z.string().min(1).optional(),
  tag    : z.string().min(1).optional(),
})

export const idParamSchema = z.object({
  id : z.string().min(1),
})
