import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Local-disk storage — the driver for our own VPS, where the app and its files
 * share a box (or a mounted volume). Nothing here is Vercel-specific.
 *
 * STORAGE_DIR points at the upload root; keep it OUTSIDE the deploy directory
 * so a redeploy never wipes it (e.g. /var/lib/talktrack/uploads).
 */
export function localRoot(): string {
  return process.env.STORAGE_DIR || path.join(process.cwd(), 'var', 'uploads');
}

/** Resolve a key under the root, refusing anything that escapes it. */
function resolveKey(key: string): string {
  const root = path.resolve(localRoot());
  const full = path.resolve(root, key);
  if (full !== root && !full.startsWith(root + path.sep)) {
    throw new Error('Invalid storage key.');
  }
  return full;
}

export async function localPut(key: string, body: Buffer): Promise<void> {
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, body);
}

export async function localGet(key: string): Promise<Buffer | null> {
  try {
    return await readFile(resolveKey(key));
  } catch {
    return null;
  }
}

export async function localRemove(key: string): Promise<void> {
  try {
    await unlink(resolveKey(key));
  } catch {
    // already gone — deleting is idempotent
  }
}
