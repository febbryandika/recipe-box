# Recipe Box

> A personal recipe manager — create, organize, and share your recipes.

![Bun](https://img.shields.io/badge/Bun-1.x-black?logo=bun)
![React](https://img.shields.io/badge/React-19-149eca?logo=react)
![Hono](https://img.shields.io/badge/Hono-4.6-e36002?logo=hono)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript)

Recipe Box lets authenticated users manage recipes — ingredients, steps, cook
time, servings, tags, and a cover image — and publish any recipe as a public,
shareable page. It's a full-stack TypeScript app: a Hono API on Bun with a
React 19 frontend, wired together with end-to-end type safety via the Hono RPC
client.

## Features

- **Authentication** — email + password sign-up / sign-in via better-auth, with rate limiting on auth endpoints.
- **Recipe CRUD** — title, description, cover image, cook time, servings, tags, plus structured ingredients (`{ amount, unit, name }`) and ordered steps.
- **Search & filter** — server-side title search (`ILIKE`) and tag filtering, combinable.
- **Public sharing** — toggle a recipe public to mint a stable `nanoid(12)` slug; the page is readable at `/r/:slug` with no auth.
- **Cover images** — multipart upload to Cloudflare R2 with MIME (`jpeg`/`png`/`webp`) and 5 MB validation; served back through the API so the bucket stays private.
- **Polished UX** — localStorage draft autosave with status indicator, optimistic share toggle with copy-to-clipboard, loading skeletons, empty states, error toasts, and ownership-scoped access.

## Screenshots

> _Add screenshots to `docs/screenshots/` and they'll render here._

| Recipe grid | Recipe form | Public recipe |
| --- | --- | --- |
| ![Recipe grid](docs/screenshots/recipe-grid.png) | ![Recipe form](docs/screenshots/recipe-form.png) | ![Public recipe](docs/screenshots/public-recipe.png) |

## Tech Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React 19 · Vite 6 · TanStack Router (file-based) · TanStack Query · Tailwind CSS v4 |
| **Backend** | Hono 4.6 on Bun · better-auth 1.2 · Zod + `@hono/zod-validator` |
| **Database** | Neon serverless PostgreSQL · Drizzle ORM 0.38 · drizzle-kit |
| **Storage** | Cloudflare R2 (S3-compatible, via `@aws-sdk/client-s3`) |
| **Shared** | Hono RPC client for end-to-end types · cuid2 · nanoid |
| **Tooling** | Bun workspaces · TypeScript 5.7 · ESLint · Prettier · Vitest · Playwright |

## Architecture

A Bun-workspace monorepo with three packages:

```
recipe-box/
├── backend/         # Hono API (Bun) — auth, recipe CRUD, sharing, R2 upload
│   ├── src/
│   │   ├── index.ts       # app entry; exports AppType for the frontend
│   │   ├── routes/        # recipes (protected) + public read routes
│   │   ├── db/            # Drizzle schema + Neon client
│   │   └── lib/           # auth, requireAuth middleware, R2, logger, validation
│   └── test/        # PGlite-backed integration tests
├── frontend/        # React 19 + Vite SPA
│   └── src/
│       ├── routes/        # file-based routes (auto-generated route tree)
│       ├── components/    # RecipeCard, builders, ShareToggle, UI primitives
│       ├── hooks/         # autosave, cover upload, debounce
│       └── lib/           # typed Hono client, auth client, query options
└── shared/          # reserved workspace (currently an empty placeholder)
```

Key decisions:

- **End-to-end type safety.** The backend exports `AppType = typeof app`; the frontend's Hono RPC client (`hc<AppType>`) consumes it, so backend route changes surface as frontend type errors. (The `shared/` package is wired into the workspace but currently empty — types flow through `AppType`, not `shared`.)
- **Auth boundary.** A `requireAuth` middleware resolves the better-auth session and injects the user into context. Protected recipe routes live on a sub-app behind that middleware; **public** routes (`/api/public/:slug`, `/api/covers/:filename`) are mounted outside it so they need no session.
- **Private-by-default images.** Covers are uploaded to R2 under `covers/<id>.<ext>` and served back through `GET /api/covers/:filename` (cached one year). The R2 bucket can stay fully private — there's no public bucket URL.
- **Data model.** Ingredients and steps are stored as JSONB on the `recipes` row (`ingredientsJson`, `stepsJson`) and replaced wholesale on update; tags are a Postgres text array. Indexes on `user_id` and `public_slug` back the list and public-read paths.
- **Frontend data flow.** TanStack Router loaders prefetch via TanStack Query, so navigation renders from cache; mutations (e.g. share toggle) update optimistically and roll back on error.

### API surface

| Method | Path | Auth | Description |
| --- | --- | :---: | --- |
| `*` | `/api/auth/**` | — | better-auth handler (sign-up / sign-in / sign-out) |
| `GET` | `/api/health` | — | Health check |
| `GET` | `/api/me` | ✅ | Current user |
| `GET` | `/api/recipes` | ✅ | List recipes (`search?`, `tag?`) |
| `POST` | `/api/recipes` | ✅ | Create recipe |
| `GET` | `/api/recipes/:id` | ✅ | Get recipe (owner only) |
| `PUT` | `/api/recipes/:id` | ✅ | Update recipe |
| `DELETE` | `/api/recipes/:id` | ✅ | Delete recipe + cover |
| `POST` | `/api/recipes/:id/share` | ✅ | Toggle public; return slug |
| `POST` | `/api/recipes/:id/cover` | ✅ | Upload cover (multipart) |
| `GET` | `/api/public/:slug` | ❌ | Public read-only recipe |
| `GET` | `/api/covers/:filename` | ❌ | Cover image proxy |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (the runtime, package manager, and test runner)
- A PostgreSQL database — a [Neon](https://neon.tech) connection string works out of the box
- _(Optional)_ Cloudflare R2 credentials — only needed to test cover-image upload

### Setup

```bash
# 1. Install all workspaces
bun install

# 2. Configure environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
#    then fill in DATABASE_URL and BETTER_AUTH_SECRET (see below)

# 3. Apply the database schema
cd backend && bun run db:push   # or: bun run db:generate && bun run db:migrate
cd ..

# 4. Run backend (:3000) + frontend (:5173) together
bun run dev
```

Open <http://localhost:5173>. In dev, Vite proxies `/api` to the backend, so no
CORS setup is needed. Recipes save fine without R2 configured — only cover
uploads require it.

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
| --- | :---: | --- |
| `DATABASE_URL` | ✅ | Postgres / Neon connection string |
| `BETTER_AUTH_SECRET` | ✅ | Session secret (≥ 32 chars; `openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | ✅ | Backend base URL (e.g. `http://localhost:3000`) |
| `FRONTEND_URL` | ✅ | Allowed CORS origin (e.g. `http://localhost:5173`) |
| `PORT` | — | Server port (default `3000`) |
| `R2_ENDPOINT` | optional | Cloudflare R2 S3 endpoint |
| `R2_ACCESS_KEY_ID` | optional | R2 access key |
| `R2_SECRET_ACCESS_KEY` | optional | R2 secret key |
| `R2_BUCKET` | optional | R2 bucket name for covers |

> The R2 bucket stays private — covers are served through the API proxy, so there is **no** `R2_PUBLIC_URL`.

### Frontend (`frontend/.env`)

| Variable | Required | Description |
| --- | :---: | --- |
| `VITE_API_URL` | ✅ | API base URL (default `http://localhost:3000`) |

## Testing

The strategy mirrors SPEC §12: unit, integration, and end-to-end layers.

```bash
# Unit tests (Vitest) — all workspaces
bun run test

# ...or per workspace
cd backend && bun run test       # slug, validation, logger
cd frontend && bun run test      # schema, uploads, cn, useAutosaveDraft

# Integration tests (backend) — runs against in-process PGlite, no external DB
cd backend && bun run test:integration
```

- **Unit** — pure logic: slug generation, Zod recipe/ingredient validation, the autosave hook, upload helpers.
- **Integration** — `backend/test/` exercises the real Hono app over an in-process [PGlite](https://github.com/electric-sql/pglite) Postgres (R2 and logging mocked via `backend/test/setup.ts`): recipe CRUD, cross-user ownership, public access, and cover upload.
- **End-to-end** — a Playwright suite (auth → create → publish → public access, plus cover upload and autosave recovery) lives on the `test/playwright-e2e` branch and is not yet merged to `main`.

## Tradeoffs & Future Improvements

- **`shared/` is a placeholder.** Type-sharing currently rides on the backend's `AppType`; the reserved `shared` package could hold cross-cutting Zod schemas to dedupe client/server validation.
- **Covers proxy through the app server.** This keeps the R2 bucket private and simple, at the cost of edge caching — a public R2 subdomain or CDN in front would offload image traffic.
- **JSONB ingredients/steps.** Storing them as JSONB favors simplicity over queryability; tag-style search inside ingredients would need a different model.
- **Hard delete, no soft delete.** Deleting a recipe removes it (and its R2 cover) permanently.
- **Two-step image upload.** A recipe is created first, then its cover is uploaded — a single atomic create-with-image flow would be smoother.
- **No CI yet.** Lint, typecheck, and tests run locally; wiring them into CI (and merging the E2E suite) is the next hardening step.
