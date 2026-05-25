import { hc } from 'hono/client'
import type { AppType } from '../../../backend/src/index'

// Hono RPC client — fully type-safe
// AppType is inferred from the backend router
export const client = hc<AppType>(import.meta.env.VITE_API_URL ?? 'http://localhost:3000')
