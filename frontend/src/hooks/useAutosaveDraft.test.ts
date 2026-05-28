import { describe, it, expect, beforeEach } from 'vitest'
import { loadDraft } from './useAutosaveDraft'

const KEY = 'recipe-box:test-draft'

describe('loadDraft', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when the key is absent', () => {
    expect(loadDraft(KEY)).toBeNull()
  })

  it('returns the parsed value for valid JSON', () => {
    const draft = { title: 'Soup', tags: ['dinner'] }
    localStorage.setItem(KEY, JSON.stringify(draft))
    expect(loadDraft<typeof draft>(KEY)).toEqual(draft)
  })

  it('returns null for malformed JSON', () => {
    localStorage.setItem(KEY, '{not valid json')
    expect(loadDraft(KEY)).toBeNull()
  })
})
