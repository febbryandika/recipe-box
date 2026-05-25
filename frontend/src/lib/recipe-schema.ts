import { z } from 'zod'

export const ingredientSchema = z.object({
  amount : z.string().min(1, 'Required'),
  unit   : z.string().min(1, 'Required'),
  name   : z.string().min(1, 'Required'),
})

export const recipeInputSchema = z.object({
  title           : z.string().min(1, 'Title is required'),
  description     : z.string().nullable().optional(),
  cookTimeMinutes : z.number().int().positive().nullable().optional(),
  servings        : z.number().int().positive().nullable().optional(),
  ingredients     : z.array(ingredientSchema),
  steps           : z.array(z.string().min(1, 'Step cannot be empty')),
  tags            : z.array(z.string()),
})

export type Ingredient = z.infer<typeof ingredientSchema>
export type RecipeInput = z.infer<typeof recipeInputSchema>
