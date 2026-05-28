import { describe, it, expect } from 'vitest'
import { SLUG_LENGTH, generateSlug, resolveSlug } from './slug'

const SLUG_PATTERN = new RegExp(`^[A-Za-z0-9_-]{${SLUG_LENGTH}}$`)

describe('generateSlug', () => {
  it('returns a slug of the configured length', () => {
    expect(generateSlug()).toHaveLength(SLUG_LENGTH)
  })

  it('uses only the nanoid url-safe alphabet', () => {
    expect(generateSlug()).toMatch(SLUG_PATTERN)
  })

  it('produces unique values across many calls', () => {
    const slugs = new Set(Array.from({ length: 1000 }, () => generateSlug()))
    expect(slugs.size).toBe(1000)
  })
})

describe('resolveSlug', () => {
  it('reuses an existing slug when one is present', () => {
    expect(resolveSlug('keepme123456')).toBe('keepme123456')
  })

  it.each([null, undefined])('generates a fresh valid slug when given %s', (value) => {
    expect(resolveSlug(value)).toMatch(SLUG_PATTERN)
  })
})
