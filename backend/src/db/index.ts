import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { env } from '../env'
import * as schema from './schema'

type Db = ReturnType<typeof drizzle<typeof schema>>

// E2E runs the real HTTP server (Playwright) against an in-process PGlite database
// instead of Neon — the `mock.module` swap the integration tests use only works under
// `bun:test`. The cast keeps the exported type identical to the Neon path so no other
// file's types shift; PGlite and neon-http share the same drizzle query API.
async function createE2eDb(): Promise<Db> {
  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle: drizzlePglite } = await import('drizzle-orm/pglite')
  const { migrate } = await import('drizzle-orm/pglite/migrator')
  const path = await import('node:path')
  const client = new PGlite()
  const d = drizzlePglite(client, { schema })
  await migrate(d, { migrationsFolder: path.resolve(import.meta.dir, '../../drizzle') })
  return d as unknown as Db
}

export const db: Db =
  process.env.E2E === 'true' ? await createE2eDb() : drizzle(neon(env.DATABASE_URL), { schema })
