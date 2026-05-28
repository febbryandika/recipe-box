import { describe, it, expect } from 'vitest'
import {
  ingredientSchema,
  recipeBodySchema,
} from './recipe-validation'

const validRecipe = {
  title           : 'Pancakes',
  description     : 'Fluffy stack',
  coverImageUrl   : 'https://example.com/cover.jpg',
  cookTimeMinutes : 20,
  servings        : 4,
  ingredients     : [{ amount: '2', unit: 'cups', name: 'flour' }],
  steps           : ['Mix', 'Cook'],
  tags            : ['breakfast'],
}

describe('recipeBodySchema', () => {
  it('accepts a fully populated recipe', () => {
    expect(recipeBodySchema.safeParse(validRecipe).success).toBe(true)
  })

  it('accepts a minimal recipe with empty arrays and omitted optionals', () => {
    const result = recipeBodySchema.safeParse({
      title       : 'Toast',
      ingredients : [],
      steps       : [],
      tags        : [],
    })
    expect(result.success).toBe(true)
  })

  it('accepts null for optional scalar fields', () => {
    const result = recipeBodySchema.safeParse({
      ...validRecipe,
      description     : null,
      coverImageUrl   : null,
      cookTimeMinutes : null,
      servings        : null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects a missing title', () => {
    const { title, ...rest } = validRecipe
    expect(recipeBodySchema.safeParse(rest).success).toBe(false)
  })

  it('rejects an empty title', () => {
    expect(recipeBodySchema.safeParse({ ...validRecipe, title: '' }).success).toBe(false)
  })

  it.each([0, -5, 2.5])('rejects non-positive/non-integer cookTimeMinutes: %s', (value) => {
    expect(recipeBodySchema.safeParse({ ...validRecipe, cookTimeMinutes: value }).success).toBe(false)
  })

  it.each([0, -1, 3.5])('rejects non-positive/non-integer servings: %s', (value) => {
    expect(recipeBodySchema.safeParse({ ...validRecipe, servings: value }).success).toBe(false)
  })

  it('rejects a non-URL coverImageUrl', () => {
    expect(recipeBodySchema.safeParse({ ...validRecipe, coverImageUrl: 'not-a-url' }).success).toBe(false)
  })
})

describe('ingredient parsing', () => {
  it('accepts a well-formed ingredient', () => {
    const result = ingredientSchema.safeParse({ amount: '1', unit: 'tbsp', name: 'sugar' })
    expect(result.success).toBe(true)
  })

  it.each(['amount', 'unit', 'name'] as const)('rejects an empty %s', (field) => {
    const base = { amount: '1', unit: 'tbsp', name: 'sugar' }
    expect(ingredientSchema.safeParse({ ...base, [field]: '' }).success).toBe(false)
  })

  it.each(['amount', 'unit', 'name'] as const)('rejects a missing %s', (field) => {
    const base: Record<string, string> = { amount: '1', unit: 'tbsp', name: 'sugar' }
    delete base[field]
    expect(ingredientSchema.safeParse(base).success).toBe(false)
  })

  it('parses an array of ingredients via the recipe schema', () => {
    const result = recipeBodySchema.safeParse({
      ...validRecipe,
      ingredients: [
        { amount: '2', unit: 'cups', name: 'flour' },
        { amount: '1', unit: 'tsp', name: 'salt' },
      ],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.ingredients).toHaveLength(2)
    }
  })

  it('rejects an ingredient array containing a malformed entry', () => {
    const result = recipeBodySchema.safeParse({
      ...validRecipe,
      ingredients: [
        { amount: '2', unit: 'cups', name: 'flour' },
        { amount: '', unit: 'tsp', name: 'salt' },
      ],
    })
    expect(result.success).toBe(false)
  })
})
