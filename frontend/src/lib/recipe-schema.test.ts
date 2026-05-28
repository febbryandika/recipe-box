import { describe, it, expect } from 'vitest'
import { ingredientSchema, recipeInputSchema } from './recipe-schema'

const validInput = {
  title           : 'Pancakes',
  description     : 'Fluffy',
  cookTimeMinutes : 20,
  servings        : 4,
  ingredients     : [{ amount: '2', unit: 'cups', name: 'flour' }],
  steps           : ['Mix', 'Cook'],
  tags            : ['breakfast'],
}

describe('recipeInputSchema', () => {
  it('accepts a valid input', () => {
    expect(recipeInputSchema.safeParse(validInput).success).toBe(true)
  })

  it('accepts null for optional scalar fields', () => {
    const result = recipeInputSchema.safeParse({
      ...validInput,
      description     : null,
      cookTimeMinutes : null,
      servings        : null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects an empty title', () => {
    expect(recipeInputSchema.safeParse({ ...validInput, title: '' }).success).toBe(false)
  })

  it('rejects an empty step string', () => {
    expect(recipeInputSchema.safeParse({ ...validInput, steps: ['Mix', ''] }).success).toBe(false)
  })

  it.each([0, -3, 1.5])('rejects non-positive/non-integer cookTimeMinutes: %s', (value) => {
    expect(recipeInputSchema.safeParse({ ...validInput, cookTimeMinutes: value }).success).toBe(false)
  })

  it.each([0, -2, 2.5])('rejects non-positive/non-integer servings: %s', (value) => {
    expect(recipeInputSchema.safeParse({ ...validInput, servings: value }).success).toBe(false)
  })
})

describe('ingredientSchema', () => {
  it('accepts a well-formed ingredient', () => {
    expect(ingredientSchema.safeParse({ amount: '1', unit: 'tsp', name: 'salt' }).success).toBe(true)
  })

  it.each(['amount', 'unit', 'name'] as const)('rejects an empty %s', (field) => {
    const base = { amount: '1', unit: 'tsp', name: 'salt' }
    expect(ingredientSchema.safeParse({ ...base, [field]: '' }).success).toBe(false)
  })
})
