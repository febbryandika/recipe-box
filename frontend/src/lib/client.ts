import { hc } from 'hono/client'
import type { AppType } from '../../../backend/src/index'

// Hono RPC client — fully type-safe
// AppType is inferred from the backend router
// credentials: 'include' so the better-auth session cookie travels with cross-origin requests
export const client = hc<AppType>(import.meta.env.VITE_API_URL ?? 'http://localhost:3000', {
  fetch: ((input, init) =>
    fetch(input, { ...init, credentials: 'include' })) as typeof fetch,
})
