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
  // Meta rejects the exchange (OAuthException 100 / subcode 36008) unless the
  // redirect_uri matches the one the JS SDK bound the code to — but the SDK does
  // not surface it. The canonical Facebook-Login-for-Business exchange uses NO
  // redirect_uri; some SDK/app configurations instead bind it to the page origin.
  // A REJECTED code is not consumed, so we can safely try the candidates in order
  // and use whichever Meta accepts. Codes expire ~30s after the dialog closes, so
  // this runs immediately in the exchange route.
  const base = (metaConfig.appUrl || '').replace(/\/+$/, '');
  const candidates: Array<Record<string, string>> = [
    {}, // canonical: no redirect_uri
    ...(base ? [{ redirect_uri: `${base}/` }, { redirect_uri: base }] : []),
  ];

  let lastText = '';
  let lastStatus = 0;
  for (const extra of candidates) {
    const url = new URL(`${graphBase()}/oauth/access_token`);
    url.searchParams.set('client_id', metaConfig.appId);
    url.searchParams.set('client_secret', metaConfig.appSecret);
    url.searchParams.set('code', code);
    for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);

    const res = await fetch(url, { method: 'GET' });
    if (res.ok) return (await res.json()) as TokenResponse;
    lastStatus = res.status;
    lastText = await res.text();
  }

  let hint = '';
  try {
    const e = JSON.parse(lastText).error;
    if (e?.error_subcode === 36008) {
      hint = ' — the authorization code was rejected. Either it expired (these codes are valid ~30s, so finish the WhatsApp dialog and let it connect without delay), or the redirect_uri did not match. Try Connect again; if it persists, confirm the app\'s Valid OAuth Redirect URI matches APP_URL exactly.';
    }
  } catch { /* keep raw */ }
  throw new Error(`Token exchange failed (${lastStatus}): ${lastText}${hint}`);
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
