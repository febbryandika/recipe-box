import type { MiddlewareHandler } from 'hono'
import { auth } from './auth'

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

export type AppVariables = {
  user: Session['user']
  session: Session['session']
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
