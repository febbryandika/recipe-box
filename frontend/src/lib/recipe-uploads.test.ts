import { describe, it, expect } from 'vitest'
import { MAX_COVER_BYTES, validateCoverFile } from './recipe-uploads'

function makeFile(type: string, size: number, name = 'cover'): File {
  const file = new File([], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('validateCoverFile', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s within the size limit', (type) => {
    expect(validateCoverFile(makeFile(type, 1024))).toEqual({ ok: true })
  })

  it('rejects an unsupported MIME type', () => {
    const result = validateCoverFile(makeFile('image/gif', 1024))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toBe('Use a JPG, PNG, or WEBP image.')
  })

  it('accepts a file exactly at the size limit', () => {
    expect(validateCoverFile(makeFile('image/png', MAX_COVER_BYTES))).toEqual({ ok: true })
  })

  it('rejects a file over the size limit', () => {
    const result = validateCoverFile(makeFile('image/png', MAX_COVER_BYTES + 1))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toBe('Image must be 5MB or smaller.')
  })
})
