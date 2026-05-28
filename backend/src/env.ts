import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL    : z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL : z.string().url(),
  FRONTEND_URL    : z.string().url(),
  PORT            : z.coerce.number().int().positive().default(3000),
  R2_ENDPOINT          : z.string().url(),
  R2_ACCESS_KEY_ID     : z.string().min(1),
  R2_SECRET_ACCESS_KEY : z.string().min(1),
  R2_BUCKET            : z.string().min(1),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
