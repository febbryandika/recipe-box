import { Hono } from 'hono'
import { getConnInfo } from 'hono/bun'
import { auth } from '../lib/auth'

export const authRoute = new Hono()
  .all('/*', (c) => {
    const req = c.req.raw
    // better-auth keys rate limiting off x-forwarded-for; when unproxied (local dev,
    // direct Bun deploy) that header is absent, so fall back to the socket address.
    if (!req.headers.get('x-forwarded-for')) {
      const address = getConnInfo(c).remote.address
      if (address) {
        const headers = new Headers(req.headers)
        headers.set('x-forwarded-for', address)
        return auth.handler(new Request(req, { headers }))
      }
    }
    return auth.handler(req)
  })
