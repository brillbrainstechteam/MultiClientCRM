import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync } from 'crypto';
import { metaConfig } from '@/lib/meta/config';

/**
 * Symmetric encryption for secrets at rest — OAuth/BISU tokens, page tokens.
 *
 * AES-256-GCM. The key comes from APP_SECRET_KEY (base64/hex, 32 bytes) when set;
 * otherwise it is derived from META_APP_SECRET via scrypt so the store still
 * works in environments that only have the Meta secret configured. Set a
 * dedicated APP_SECRET_KEY in production and rotate it independently of the app
 * secret. Tokens are NEVER stored or logged in plaintext.
 */

function key(): Buffer {
  const raw = process.env.APP_SECRET_KEY ?? '';
  if (raw) {
    // Accept base64 or hex; must decode to 32 bytes.
    const b = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
    if (b.length === 32) return b;
  }
  // Fallback: derive a stable 32-byte key from the Meta app secret.
  const secret = metaConfig.appSecret || 'talktrack-dev-only-secret';
  return scryptSync(secret, 'talktrack-secret-store-v1', 32);
}

/** Encrypt a string → "v1:<iv>:<tag>:<ciphertext>" (all base64). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

/** Decrypt a value produced by encryptSecret. Returns null if it can't be read. */
export function decryptSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  const parts = value.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') return null;
  try {
    const [, ivB, tagB, dataB] = parts;
    const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/** Meta appsecret_proof: HMAC-SHA256 of the access token keyed with the app secret. */
export function appSecretProof(accessToken: string): string {
  return createHmac('sha256', metaConfig.appSecret).update(accessToken).digest('hex');
}
