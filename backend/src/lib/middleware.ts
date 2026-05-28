import type { MiddlewareHandler } from 'hono'
import type { RequestIdVariables } from 'hono/request-id'
import { auth } from './auth'
import { logger } from './logger'

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

export type AppVariables = RequestIdVariables & {
  user: Session['user']
  session: Session['session']
}

export const requestLogger: MiddlewareHandler<{ Variables: RequestIdVariables }> = async (c, next) => {
  const start = performance.now()
  await next()
  logger.info('request', {
    requestId  : c.get('requestId'),
    method     : c.req.method,
    path       : c.req.path,
    status     : c.res.status,
    durationMs : Math.round(performance.now() - start),
  })
}

export const requireAuth: MiddlewareHandler<{ Variables: AppVariables }> = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  c.set('user', session.user)
  c.set('session', session.session)
  await next()
}
