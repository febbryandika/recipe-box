import { queryOptions } from '@tanstack/react-query'
import type { InferResponseType } from 'hono/client'
import { client } from './client'

export class RecipeNotFoundError extends Error {
  constructor() {
    super('Recipe not found')
    this.name = 'RecipeNotFoundError'
  }
}

export type Recipe = InferResponseType<
  (typeof client.api.recipes)[':id']['$get'],
  200
>

export type PublicRecipe = InferResponseType<
  (typeof client.api.public)[':slug']['$get'],
  200
>

export function recipeQueryOptions(id: string) {
  return queryOptions({
    queryKey: ['recipe', id],
    queryFn: async (): Promise<Recipe> => {
      const res = await client.api.recipes[':id'].$get({ param: { id } })
      if (res.status === 404) throw new RecipeNotFoundError()
      if (!res.ok) throw new Error('Failed to load recipe')
      return (await res.json()) as Recipe
    },
  })
}

export function publicRecipeQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ['public-recipe', slug],
    queryFn: async (): Promise<PublicRecipe> => {
      const res = await client.api.public[':slug'].$get({ param: { slug } })
      if (res.status === 404) throw new RecipeNotFoundError()
      if (!res.ok) throw new Error('Failed to load recipe')
      return (await res.json()) as PublicRecipe
    },
  })
}
