import { describe, it, expect } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('joins truthy class strings with a space', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })

  it('drops false, null, and undefined values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
  })

  it('returns an empty string when given no arguments', () => {
    expect(cn()).toBe('')
  })

  it('returns an empty string when all values are falsy', () => {
    expect(cn(false, null, undefined)).toBe('')
  })
})
