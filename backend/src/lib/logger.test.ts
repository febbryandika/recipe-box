import { describe, it, expect } from 'vitest'
import { serializeError } from './logger'

describe('serializeError', () => {
  it('extracts name, message, and stack from an Error', () => {
    const err = new Error('boom')
    const result = serializeError(err) as { name: string; message: string; stack?: string }

    expect(result.name).toBe('Error')
    expect(result.message).toBe('boom')
    expect(result.stack).toBe(err.stack)
  })

  it('preserves a custom error name set on the instance', () => {
    class UploadError extends Error {
      constructor(message: string) {
        super(message)
        this.name = 'UploadError'
      }
    }
    const result = serializeError(new UploadError('failed')) as { name: string; message: string }

    expect(result.name).toBe('UploadError')
    expect(result.message).toBe('failed')
  })

  it.each([
    ['a string', 'plain string'],
    ['a number', 42],
    ['null', null],
    ['a plain object', { code: 'E_NOPE' }],
  ])('returns %s unchanged when it is not an Error', (_label, value) => {
    expect(serializeError(value)).toBe(value)
  })
})
