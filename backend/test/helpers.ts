import { sql } from 'drizzle-orm'
import type { Ingredient } from '../src/db/schema'
import { app } from '../src/index'
import { auth } from '../src/lib/auth'
import { db } from './setup'

export { app, db }
export { r2Calls } from './setup'

// Owner-facing recipe row, as returned by the protected CRUD endpoints.
export type RecipeRow = {
  id: string
  userId: string
  title: string
  description: string | null
  coverImageUrl: string | null
  cookTimeMinutes: number | null
  servings: number | null
  ingredientsJson: Ingredient[]
  stepsJson: string[]
  tags: string[]
  isPublic: boolean
  publicSlug: string | null
  createdAt: string
  updatedAt: string
}

export type ShareResult = { isPublic: boolean; publicSlug: string | null }

// Read-only subset returned by GET /api/public/:slug.
export type PublicRecipe = Pick<
  RecipeRow,
  | 'id'
  | 'title'
  | 'description'
  | 'coverImageUrl'
  | 'cookTimeMinutes'
  | 'servings'
  | 'ingredientsJson'
  | 'stepsJson'
  | 'tags'
  | 'createdAt'
>

// Parse a JSON response body with the expected shape. Bun types Response.json()
// as `unknown`, so tests state the shape they expect here.
export async function json<T>(res: Response): Promise<T> {
  return (await res.json()) as T
}

let userCounter = 0

export type TestUser = {
  cookie: string
  user: { id: string; email: string }
}

// Create a user and return a Cookie header carrying its session. Uses the
// better-auth server API (not the HTTP route) so it bypasses the auth rate
// limiter and CSRF/origin checks.
export async function createUserSession(
  overrides: { email?: string; password?: string; name?: string } = {},
): Promise<TestUser> {
  const email = overrides.email ?? `user-${Date.now()}-${userCounter++}@test.dev`
  const password = overrides.password ?? 'password-12345'
  const name = overrides.name ?? 'Test User'

  const res = await auth.api.signUpEmail({
    body: { email, password, name },
    asResponse: true,
  })

  if (!res.ok) {
    throw new Error(`signUpEmail failed: ${res.status} ${await res.text()}`)
  }

  // Replay every Set-Cookie value (name=value, attributes stripped).
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ')

  const body = (await res.json()) as { user: { id: string; email: string } }
  return { cookie, user: body.user }
}

// Truncate all tables between tests. CASCADE clears better-auth's session/account
// rows that reference `user`.
export async function resetDb(): Promise<void> {
  await db.execute(
    sql.raw(
      'TRUNCATE TABLE recipes, "session", "account", "verification", "user" RESTART IDENTITY CASCADE',
    ),
  )
}

type RecipePayload = {
  title: string
  description?: string | null
  coverImageUrl?: string | null
  cookTimeMinutes?: number | null
  servings?: number | null
  ingredients: Array<{ amount: string; unit: string; name: string }>
  steps: string[]
  tags: string[]
}

export function makeRecipePayload(overrides: Partial<RecipePayload> = {}): RecipePayload {
  return {
    title: 'Spaghetti Carbonara',
    description: 'Classic Roman pasta',
    cookTimeMinutes: 20,
    servings: 2,
    ingredients: [
      { amount: '200', unit: 'g', name: 'spaghetti' },
      { amount: '2', unit: 'pcs', name: 'eggs' },
    ],
    steps: ['Boil pasta', 'Mix eggs and cheese', 'Combine'],
    tags: ['pasta', 'italian'],
    ...overrides,
  }
}

// JSON request against the protected API, authenticated with `cookie`.
export async function authedJson(
  cookie: string,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<Response> {
  return app.request(path, {
    method: init.method ?? 'GET',
    headers: {
      Cookie: cookie,
      ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  })
}

// A File of `size` bytes with the given MIME type, for cover-upload tests.
// The filename needs a matching extension or Bun's multipart serializer drops
// the part's content-type (and the route would reject it as untyped).
const EXT_BY_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'text/plain': 'txt',
}

export function imageFile(type = 'image/png', size = 64): File {
  const ext = EXT_BY_TYPE[type] ?? 'bin'
  return new File([new Uint8Array(size)], `cover.${ext}`, { type })
}
