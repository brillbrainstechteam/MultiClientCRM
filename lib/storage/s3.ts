/**
 * S3-compatible storage — MinIO on our VPS, Cloudflare R2, Backblaze B2 or AWS
 * S3, whichever the deployment uses. The SDK is imported lazily so a local-disk
 * deployment never loads it.
 *
 * Env: S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY,
 *      S3_ENDPOINT (MinIO/R2), S3_FORCE_PATH_STYLE=true (MinIO).
 */

export function s3Config() {
  return {
    bucket: process.env.S3_BUCKET ?? '',
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || undefined,
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    // MinIO serves buckets as a path, not a subdomain.
    forcePathStyle: /^(1|true|yes)$/i.test(process.env.S3_FORCE_PATH_STYLE ?? ''),
  };
}

async function client() {
  const cfg = s3Config();
  if (!cfg.bucket || !cfg.accessKeyId || !cfg.secretAccessKey) {
    throw new Error('S3 storage is selected but S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY are not set.');
  }
  const { S3Client } = await import('@aws-sdk/client-s3');
  return new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: cfg.forcePathStyle,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });
}

export async function s3Put(key: string, body: Buffer, contentType: string): Promise<void> {
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  const c = await client();
  await c.send(new PutObjectCommand({ Bucket: s3Config().bucket, Key: key, Body: body, ContentType: contentType }));
}

export async function s3Get(key: string): Promise<Buffer | null> {
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  const c = await client();
  try {
    const res = await c.send(new GetObjectCommand({ Bucket: s3Config().bucket, Key: key }));
    const bytes = await res.Body?.transformToByteArray();
    return bytes ? Buffer.from(bytes) : null;
  } catch {
    return null;
  }
}

export async function s3Remove(key: string): Promise<void> {
  const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  const c = await client();
  await c.send(new DeleteObjectCommand({ Bucket: s3Config().bucket, Key: key })).catch(() => undefined);
}
