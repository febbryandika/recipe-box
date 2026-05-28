import { GetObjectCommand } from '@aws-sdk/client-s3'
import { Hono } from 'hono'
import { env } from '../env'
import { logger, serializeError } from '../lib/logger'
import { r2 } from '../lib/r2'

const ALLOWED_EXT = /\.(jpe?g|png|webp)$/i
const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg  : 'image/jpeg',
  jpeg : 'image/jpeg',
  png  : 'image/png',
  webp : 'image/webp',
}

export const publicCoversRoute = new Hono()
  .get('/:filename', async (c) => {
    const filename = c.req.param('filename')
    if (!ALLOWED_EXT.test(filename)) return c.text('Not found', 404)

    const key = `covers/${filename}`
    try {
      const res = await r2.send(
        new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key }),
      )
      const body = res.Body as ReadableStream | undefined
      if (!body) return c.text('Not found', 404)

      const ext = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase()
      const contentType = res.ContentType ?? CONTENT_TYPE_BY_EXT[ext] ?? 'application/octet-stream'

      return new Response(body, {
        headers: {
          'Content-Type'  : contentType,
          'Cache-Control' : 'public, max-age=31536000, immutable',
          ...(res.ContentLength != null
            ? { 'Content-Length': String(res.ContentLength) }
            : {}),
        },
      })
    } catch (err: any) {
      if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) {
        return c.text('Not found', 404)
      }
      logger.error('cover proxy error', { key, err: serializeError(err) })
      return c.text('Upstream error', 502)
    }
  })
