import { defineConfig, devices } from '@playwright/test'

// E2E runs on dedicated ports so it never collides with — or writes to — a running
// `bun run dev` stack (backend :3000 / frontend :5173, which uses the real Neon DB).
// Playwright boots its own servers here; the backend uses an in-process PGlite DB.
const BACKEND_URL = 'http://localhost:3100'
const FRONTEND_URL = 'http://localhost:4173'
const AUTH_STATE = 'e2e/.auth/user.json'

// Dummy env for the E2E backend. With E2E=true the server boots an in-process PGlite
// database (see backend/src/db/index.ts), so DATABASE_URL / R2_* are never used — they
// only need to satisfy the Zod validation in backend/src/env.ts.
const backendEnv = {
  E2E: 'true',
  DATABASE_URL: 'postgres://test:test@localhost:5432/test',
  BETTER_AUTH_SECRET: 'e2e-secret-e2e-secret-e2e-secret-0123456789',
  BETTER_AUTH_URL: BACKEND_URL,
  FRONTEND_URL,
  PORT: '3100',
  R2_ENDPOINT: 'https://test.r2.cloudflarestorage.com',
  R2_ACCESS_KEY_ID: 'test-access-key',
  R2_SECRET_ACCESS_KEY: 'test-secret-key',
  R2_BUCKET: 'test-bucket',
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'html' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /global\.setup\.ts/ },
    {
      name: 'authed',
      testMatch: /(recipe-creation|publish|public-access|autosave)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: AUTH_STATE },
      dependencies: ['setup'],
    },
    {
      name: 'anon',
      testMatch: /auth\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'bun run src/index.ts',
      cwd: 'backend',
      url: `${BACKEND_URL}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: backendEnv,
    },
    {
      command: 'bunx vite --port 4173 --strictPort',
      cwd: 'frontend',
      url: FRONTEND_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { VITE_API_URL: BACKEND_URL },
    },
  ],
})
