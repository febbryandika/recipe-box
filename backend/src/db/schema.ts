import { pgTable, text, timestamp, boolean, integer, jsonb, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'

// ── better-auth required tables ──────────────────────────────────────────────
// Do NOT rename these tables or columns — better-auth expects this exact shape.
// Run `bunx @better-auth/cli generate` to regenerate if you add auth plugins.

export const user = pgTable('user', {
  id:            text('id').primaryKey(),
  name:          text('name').notNull(),
  email:         text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull(),
  image:         text('image'),
  createdAt:     timestamp('created_at').notNull(),
  updatedAt:     timestamp('updated_at').notNull(),
})

export const session = pgTable('session', {
  id:        text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token:     text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId:    text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id:                     text('id').primaryKey(),
  accountId:              text('account_id').notNull(),
  providerId:             text('provider_id').notNull(),
  userId:                 text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken:            text('access_token'),
  refreshToken:           text('refresh_token'),
  idToken:                text('id_token'),
  accessTokenExpiresAt:   timestamp('access_token_expires_at'),
  refreshTokenExpiresAt:  timestamp('refresh_token_expires_at'),
  scope:                  text('scope'),
  password:               text('password'),
  createdAt:              timestamp('created_at').notNull(),
  updatedAt:              timestamp('updated_at').notNull(),
})

export const verification = pgTable('verification', {
  id:         text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value:      text('value').notNull(),
  expiresAt:  timestamp('expires_at').notNull(),
  createdAt:  timestamp('created_at'),
  updatedAt:  timestamp('updated_at'),
})

// ── Your app tables go below ──────────────────────────────────────────────────

export type Ingredient = { amount: string; unit: string; name: string }

export const recipes = pgTable('recipes', {
  id:              text('id').primaryKey().$defaultFn(() => createId()),
  userId:          text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  title:           text('title').notNull(),
  description:     text('description'),
  coverImageUrl:   text('cover_image_url'),
  cookTimeMinutes: integer('cook_time_minutes'),
  servings:        integer('servings'),
  ingredientsJson: jsonb('ingredients_json').$type<Ingredient[]>().notNull().default(sql`'[]'::jsonb`),
  stepsJson:       jsonb('steps_json').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  tags:            text('tags').array().notNull().default(sql`'{}'::text[]`),
  isPublic:        boolean('is_public').notNull().default(false),
  publicSlug:      text('public_slug').unique(),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('idx_recipe_user').on(t.userId),
  index('idx_recipe_slug').on(t.publicSlug),
])
