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
  // Canonical Facebook-Login-for-Business exchange: no redirect_uri. The code is
  // a business-login code with a 30-second TTL, so this must run immediately.
  const url = new URL(`${graphBase()}/oauth/access_token`);
  url.searchParams.set('client_id', metaConfig.appId);
  url.searchParams.set('client_secret', metaConfig.appSecret);
  url.searchParams.set('code', code);

  const res = await fetch(url, { method: 'GET' });
  if (res.ok) return (await res.json()) as TokenResponse;

  const text = await res.text();
  let hint = '';
  try {
    const e = JSON.parse(text).error;
    if (e?.error_subcode === 36008) {
      hint = ' — the authorization code was rejected (most likely it expired: these codes are valid for only 30 seconds, so the connection must be completed quickly).';
    }
  } catch { /* keep raw */ }
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
