// Preloaded before any test file (see bunfig.toml).
//
// Swaps the production singletons so the suite is fully hermetic:
//   - `src/db`        → an in-process PGlite database (real Postgres semantics)
//   - `src/lib/r2`    → fakes that record calls instead of hitting Cloudflare
//   - `src/lib/logger`→ no-ops so request logs don't drown the test output
//
// `mock.module` keys on the resolved module path, so every `import { db } from
// '../db'` across auth.ts and the route files resolves to the PGlite instance.
// This runs before the test files import the app, so better-auth builds its
// drizzle adapter against PGlite too.

import { mock } from 'bun:test'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import * as schema from '../src/db/schema'

// Dummy env — set unconditionally so no real credentials leak into the run.
// DATABASE_URL / R2_* are never actually used (their modules are mocked away);
// they only need to satisfy the Zod validation in src/env.ts.
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test'
process.env.BETTER_AUTH_SECRET = 'test-secret-test-secret-test-secret-0123456789'
process.env.BETTER_AUTH_URL = 'http://localhost:3000'
process.env.FRONTEND_URL = 'http://localhost:5173'
process.env.R2_ENDPOINT = 'https://test.r2.cloudflarestorage.com'
process.env.R2_ACCESS_KEY_ID = 'test-access-key'
process.env.R2_SECRET_ACCESS_KEY = 'test-secret-key'
process.env.R2_BUCKET = 'test-bucket'

const client = new PGlite()
export const db = drizzle(client, { schema })

await migrate(db, { migrationsFolder: path.resolve(import.meta.dir, '../drizzle') })

// Records R2 interactions so tests can assert the route called them.
export const r2Calls = {
  uploads: [] as Array<{ contentType: string; ext: string; url: string }>,
  deletes: [] as string[],
}

async function uploadCover(_body: Buffer, contentType: string, ext: string) {
  const url = `http://localhost:3000/api/covers/test-cover.${ext}`
  r2Calls.uploads.push({ contentType, ext, url })
  return { key: `covers/test-cover.${ext}`, url }
}

async function deleteCoverByUrl(url: string) {
  r2Calls.deletes.push(url)
}

// `r2` (the S3 client) is imported by the public-covers route at module load.
// It's never invoked in these tests, so a throwing stub is enough to satisfy
// the import binding while flagging any accidental use.
const r2 = {
  send: () => {
    throw new Error('R2 client is not available in tests')
  },
}

mock.module('../src/db', () => ({ db }))
mock.module('../src/lib/r2', () => ({ r2, uploadCover, deleteCoverByUrl }))
mock.module('../src/lib/logger', () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {} },
  serializeError: (err: unknown) => err,
}))
