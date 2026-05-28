import { nanoid } from 'nanoid'

export const SLUG_LENGTH = 12

export function generateSlug(): string {
  return nanoid(SLUG_LENGTH)
}

export function resolveSlug(existing: string | null | undefined): string {
  return existing ?? generateSlug()
}
