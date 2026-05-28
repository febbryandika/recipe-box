import { client } from './client'
import type { Recipe } from './recipe-queries'

export const MAX_COVER_BYTES = 5 * 1024 * 1024
export const ALLOWED_COVER_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export type CoverValidation = { ok: true } | { ok: false; message: string }

export function validateCoverFile(file: File): CoverValidation {
  if (!(ALLOWED_COVER_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, message: 'Use a JPG, PNG, or WEBP image.' }
  }
  if (file.size > MAX_COVER_BYTES) {
    return { ok: false, message: 'Image must be 5MB or smaller.' }
  }
  return { ok: true }
}

export async function uploadCover(
  recipeId: string,
  file: File,
): Promise<Recipe> {
  const res = await client.api.recipes[':id'].cover.$post({
    param: { id: recipeId },
    form: { file },
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: string }
      | null
    throw new Error(body?.error ?? 'Failed to upload cover image')
  }

  return (await res.json()) as Recipe
}
