import { graphBase, metaConfig } from './config';

/**
 * Server-only WhatsApp Cloud API (Graph) helpers. Never import from client code.
 */

export interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

/**
 * Exchange the Embedded Signup authorization code for a business access token.
 *
 * The Facebook JS SDK (`FB.login`) does not surface which `redirect_uri` it bound
 * the code to, and Meta rejects the exchange (OAuthException 100 / subcode 36008)
 * unless we send an identical one. So we try the known candidates in order and
 * use whichever Meta accepts. A rejected code is not consumed, so retrying with a
 * different redirect_uri is safe.
 */
export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  // Facebook Login for Business / Embedded Signup: exchange the single-use code
  // (30s TTL) for a business integration system user access token. The canonical
  // exchange sends client_id + client_secret + code and NO redirect_uri — the
  // JS-SDK code is not bound to one. Codes are SINGLE-USE, so this must call the
  // endpoint EXACTLY ONCE (an earlier multi-candidate loop consumed the code and
  // produced a misleading "redirect_uri" error).
  const url = new URL(`${graphBase()}/oauth/access_token`);
  url.searchParams.set('client_id', metaConfig.appId);
  url.searchParams.set('client_secret', metaConfig.appSecret);
  url.searchParams.set('code', code);

  const res = await fetch(url, { method: 'GET' });
  const text = await res.text();
  if (res.ok) return JSON.parse(text) as TokenResponse;

  let hint = '';
  try {
    const e = JSON.parse(text).error;
    if (e?.error_subcode === 36008) {
      hint = ' — Meta could not validate the authorization code. It is single-use and expires 30s after the popup closes, so complete the WhatsApp dialog and let it connect immediately (do not linger on the "previously linked" screen), then retry. If it still fails, this onboarding flow likely needs Tech Provider / Advanced Access on the Meta app.';
    }
  } catch { /* keep raw error body */ }
  throw new Error(`Token exchange failed (${res.status}): ${text}${hint}`);
}

/** Subscribe THIS app to a client's WABA so its webhooks flow to our endpoint. */
export async function subscribeAppToWaba(wabaId: string, token: string): Promise<void> {
  const res = await fetch(`${graphBase()}/${wabaId}/subscribed_apps`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Subscribe app failed (${res.status}): ${await res.text()}`);
}

export interface PhoneNumber {
  id: string;
  display_phone_number: string;
  verified_name: string;
}

/** List the phone numbers on a WABA (to resolve the connected number's details). */
export async function getPhoneNumbers(wabaId: string, token: string): Promise<PhoneNumber[]> {
  const res = await fetch(
    `${graphBase()}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`List phone numbers failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { data?: PhoneNumber[] };
  return json.data ?? [];
}
