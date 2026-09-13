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
  // Which redirect_uri the code is bound to depends on how the SDK logged the
  // user in. With FedCM (Chrome) the dialog binds to the app's Valid OAuth
  // Redirect URI (APP_URL with a trailing slash), so that is the default.
  // META_EXCHANGE_REDIRECT_URI overrides it; set it to an empty string to send
  // no redirect_uri at all (the classic Business-Login behaviour).
  const override = process.env.META_EXCHANGE_REDIRECT_URI;
  const redirectUri =
    override !== undefined ? override : `${(metaConfig.appUrl || '').replace(/\/+$/, '')}/`;

  const url = new URL(`${graphBase()}/oauth/access_token`);
  url.searchParams.set('client_id', metaConfig.appId);
  url.searchParams.set('client_secret', metaConfig.appSecret);
  url.searchParams.set('code', code);
  if (redirectUri) url.searchParams.set('redirect_uri', redirectUri);

  const res = await fetch(url, { method: 'GET' });
  const text = await res.text();
  if (res.ok) return JSON.parse(text) as TokenResponse;

  // The code is single-use, so we get exactly one attempt — surface precisely
  // what we sent so a failure is diagnosable without guessing.
  const used = redirectUri ? `redirect_uri="${redirectUri}"` : 'no redirect_uri';
  throw new Error(`Token exchange failed (${res.status}) using ${used}: ${text}`);
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
