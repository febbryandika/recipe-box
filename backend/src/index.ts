import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'
import { env } from './env'
import { requireAuth, type AppVariables } from './lib/middleware'
import { authRoute } from './routes/auth'

// Protected routes — chained registration so RPC types flow through
const api = new Hono<{ Variables: AppVariables }>()
  .use('*', requireAuth)
  .get('/me', (c) => c.json({ user: c.get('user') }))

// Chain everything on the same builder so the RPC type carries every route.
// Splitting via `app.use(...)` / `app.route(...)` statements drops the chain
// generics and AppType collapses to the empty base.
const app = new Hono<{ Variables: AppVariables }>()
  .use('*', logger())
  .use(
    '*',
    cors({
      origin        : env.FRONTEND_URL,
      allowHeaders  : ['Content-Type', 'Authorization'],
      allowMethods  : ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      exposeHeaders : ['Content-Length'],
      maxAge        : 600,
      credentials   : true,
    })
  )
  .onError((err, c) => {
    console.error(err)
    if (err instanceof HTTPException) return err.getResponse()
    return c.json({ error: 'Internal server error' }, 500)
  })
  .get('/api/health', (c) => c.json({ status: 'ok' }))
  .route('/api/auth', authRoute)
  .route('/api', api)

export type AppType = typeof app

console.log(`Server running on http://localhost:${env.PORT}`)

export default {
  port  : env.PORT,
  fetch : app.fetch,
}
