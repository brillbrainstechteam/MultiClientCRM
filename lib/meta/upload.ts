import { metaConfig, graphBase } from './config';

/**
 * Upload a sample media file to Meta's Resumable Upload API and return the
 * header handle used when creating a template with an IMAGE/VIDEO/DOCUMENT
 * header. Two steps: open an upload session, then POST the bytes; Meta returns
 * `{ h: "<handle>" }`.
 *
 * Uses the app access token (appId|appSecret) — the resumable upload endpoint
 * is app-scoped, not WABA-scoped.
 */
export async function uploadHeaderSample(bytes: Buffer, mimeType: string, fileName: string): Promise<string> {
  const { appId, appSecret } = metaConfig;
  if (!appId || !appSecret) {
    throw new Error('Media-header templates need META app credentials (NEXT_PUBLIC_META_APP_ID + META_APP_SECRET).');
  }
  const appToken = `${appId}|${appSecret}`;

  // 1) Open an upload session.
  const sessionUrl = `${graphBase()}/${appId}/uploads?file_name=${encodeURIComponent(fileName)}`
    + `&file_length=${bytes.length}&file_type=${encodeURIComponent(mimeType)}&access_token=${encodeURIComponent(appToken)}`;
  const sRes = await fetch(sessionUrl, { method: 'POST' });
  const sJson = (await sRes.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
  if (!sRes.ok || !sJson.id) {
    throw new Error(sJson.error?.message ?? `Could not start the media upload (${sRes.status}).`);
  }

  // 2) Upload the bytes to the session; Meta returns the reusable handle.
  const uRes = await fetch(`${graphBase()}/${sJson.id}`, {
    method: 'POST',
    headers: { Authorization: `OAuth ${appToken}`, file_offset: '0', 'Content-Type': mimeType },
    body: new Uint8Array(bytes),
  });
  const uJson = (await uRes.json().catch(() => ({}))) as { h?: string; error?: { message?: string } };
  if (!uRes.ok || !uJson.h) {
    throw new Error(uJson.error?.message ?? `Could not upload the sample media (${uRes.status}).`);
  }
  return uJson.h;
}
