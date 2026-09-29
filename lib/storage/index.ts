import { localGet, localPut, localRemove, localRoot } from './local';
import { s3Config, s3Get, s3Put, s3Remove } from './s3';

/**
 * Where uploaded files live. Two drivers, picked by env, so the same code runs
 * on our VPS (local disk, or MinIO alongside it) and on any S3-compatible
 * cloud bucket — no hosting-specific storage service is involved.
 *
 *   STORAGE_DRIVER=local  + STORAGE_DIR=/var/lib/talktrack/uploads
 *   STORAGE_DRIVER=s3     + S3_* (MinIO, Cloudflare R2, Backblaze B2, AWS S3)
 *
 * With STORAGE_DRIVER unset we use S3 when a bucket is configured, else disk.
 */
export type DriverName = 'local' | 's3';

export function activeDriver(): DriverName {
  const explicit = (process.env.STORAGE_DRIVER ?? '').toLowerCase();
  if (explicit === 's3' || explicit === 'local') return explicit;
  return s3Config().bucket ? 's3' : 'local';
}

/** Whether uploads can work right now, and what to fix when they cannot. */
export function storageStatus(): { driver: DriverName; ready: boolean; detail: string } {
  const driver = activeDriver();
  if (driver === 's3') {
    const cfg = s3Config();
    const missing = [
      !cfg.bucket && 'S3_BUCKET',
      !cfg.accessKeyId && 'S3_ACCESS_KEY_ID',
      !cfg.secretAccessKey && 'S3_SECRET_ACCESS_KEY',
    ].filter(Boolean) as string[];
    return missing.length
      ? { driver, ready: false, detail: `Set ${missing.join(', ')} to enable uploads.` }
      : { driver, ready: true, detail: `S3-compatible bucket "${cfg.bucket}"${cfg.endpoint ? ` at ${cfg.endpoint}` : ''}.` };
  }
  // A serverless host gives us a read-only filesystem, so say so here rather
  // than letting every upload fail at write time.
  if (process.env.VERCEL) {
    return {
      driver,
      ready: false,
      detail: 'This host has a read-only filesystem. Configure S3_* for an S3-compatible bucket, or run on the VPS where STORAGE_DIR is writable.',
    };
  }
  return { driver, ready: true, detail: `Local disk at ${localRoot()}.` };
}

export async function putFile(key: string, body: Buffer, contentType: string): Promise<DriverName> {
  const driver = activeDriver();
  if (driver === 's3') await s3Put(key, body, contentType);
  else await localPut(key, body);
  return driver;
}

/** Read bytes back from the driver that stored them (recorded per file). */
export async function getFile(key: string, driver: DriverName): Promise<Buffer | null> {
  return driver === 's3' ? s3Get(key) : localGet(key);
}

export async function removeFile(key: string, driver: DriverName): Promise<void> {
  if (driver === 's3') await s3Remove(key);
  else await localRemove(key);
}
