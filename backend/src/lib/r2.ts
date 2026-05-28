import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { createId } from '@paralleldrive/cuid2'
import { env } from '../env'

export const r2 = new S3Client({
  region          : 'auto',
  endpoint        : env.R2_ENDPOINT,
  credentials     : {
    accessKeyId     : env.R2_ACCESS_KEY_ID,
    secretAccessKey : env.R2_SECRET_ACCESS_KEY,
  },
})

const PROXY_PREFIX = env.BETTER_AUTH_URL.replace(/\/+$/, '') + '/api/covers/'
const LEGACY_R2_DEV = /^https:\/\/pub-[a-f0-9]+\.r2\.dev\/(.+)$/i

export type CoverUploadResult = { key: string; url: string }

export async function uploadCover(
  body: Buffer,
  contentType: string,
  ext: string,
): Promise<CoverUploadResult> {
  const key = `covers/${createId()}.${ext}`
  await r2.send(
    new PutObjectCommand({
      Bucket      : env.R2_BUCKET,
      Key         : key,
      Body        : body,
      ContentType : contentType,
    }),
  )
  const filename = key.slice('covers/'.length)
  return { key, url: `${PROXY_PREFIX}${filename}` }
}

function keyFromUrl(url: string): string | null {
  if (url.startsWith(PROXY_PREFIX)) {
    const filename = url.slice(PROXY_PREFIX.length)
    return filename ? `covers/${filename}` : null
  }
  const m = url.match(LEGACY_R2_DEV)
  return m ? m[1] : null
}

export async function deleteCoverByUrl(url: string): Promise<void> {
  const key = keyFromUrl(url)
  if (!key) {
    console.warn('[r2] skipping delete — URL did not match known prefixes:', url)
    return
  }
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: key }))
  } catch (err) {
    console.error('[r2] failed to delete cover object', { key, err })
  }
}
