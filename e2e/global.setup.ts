import { test as setup, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { BACKEND_URL, FRONTEND_URL, TEST_PASSWORD, uniqueEmail } from './helpers'

const AUTH_STATE = path.join('e2e', '.auth', 'user.json')

// Sign up one shared user via the API and persist its session cookie. The `authed`
// project loads this storageState so the create/publish/autosave specs start logged in,
// without each test repeating the login UI (the login flow itself is covered by auth.spec.ts).
setup('authenticate shared user', async ({ request }) => {
  const res = await request.post(`${BACKEND_URL}/api/auth/sign-up/email`, {
    headers: { origin: FRONTEND_URL },
    data: { email: uniqueEmail(), password: TEST_PASSWORD, name: 'E2E Shared User' },
  })
  expect(res.ok(), `shared sign-up failed: ${res.status()} ${await res.text()}`).toBeTruthy()

  await mkdir(path.dirname(AUTH_STATE), { recursive: true })
  await request.storageState({ path: AUTH_STATE })
})
