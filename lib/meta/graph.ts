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
  // Default: NO redirect_uri (Meta's canonical Facebook-Login-for-Business /
  // Embedded Signup exchange). The JS-SDK businesslogin code is not bound to a
  // redirect_uri, and sending one is the usual cause of OAuthException 36008.
  // META_EXCHANGE_REDIRECT_URI can force a value only if a future flow needs it.
  const override = process.env.META_EXCHANGE_REDIRECT_URI;
  const redirectUri = override !== undefined ? override : '';

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

export interface RegisterResult {
  ok: boolean;
  /** True when Meta requires the number's existing two-step PIN (client-owned). */
  pinRequired: boolean;
  error?: string;
}

/**
 * Register a number for Cloud API use with a two-step-verification PIN.
 * New numbers: we pass a PIN we generated. Existing numbers with 2FA already on:
 * Meta rejects a wrong PIN — we surface pinRequired so the UI can ask the client.
 * Coexistence numbers do not need this (they come registered).
 */
export async function registerPhoneNumber(phoneNumberId: string, token: string, pin: string): Promise<RegisterResult> {
  const res = await fetch(`${graphBase()}/${phoneNumberId}/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', pin }),
  });
  if (res.ok) return { ok: true, pinRequired: false };
  const body = (await res.json().catch(() => ({}))) as { error?: { message?: string; error_subcode?: number } };
  const sub = body.error?.error_subcode;
  // 2388080/2388081 (and similar) => two-step PIN is set and ours didn't match.
  const pinRequired = sub === 2388080 || sub === 2388081 || /pin|two-?step/i.test(body.error?.message ?? '');
  return { ok: false, pinRequired, error: body.error?.message ?? `register failed (${res.status})` };
}

export interface PhoneHealth {
  verifiedName: string | null;
  displayPhone: string | null;
  qualityRating: string | null;      // GREEN | YELLOW | RED | UNKNOWN
  messagingTier: string | null;      // e.g. TIER_1K
  codeVerificationStatus: string | null;
}

/** Read a number's live health from Meta for the Number Registry. */
export async function getPhoneNumberHealth(phoneNumberId: string, token: string): Promise<PhoneHealth | null> {
  const res = await fetch(
    `${graphBase()}/${phoneNumberId}?fields=verified_name,display_phone_number,quality_rating,messaging_limit_tier,code_verification_status`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  );
  if (!res.ok) return null;
  const j = (await res.json().catch(() => ({}))) as Record<string, string>;
  return {
    verifiedName: j.verified_name ?? null,
    displayPhone: j.display_phone_number ?? null,
    qualityRating: (j.quality_rating ?? null),
    messagingTier: (j.messaging_limit_tier ?? null),
    codeVerificationStatus: (j.code_verification_status ?? null),
  };
}

// ---- Server-side (redirect) Embedded Signup -------------------------------
// The JS-SDK popup binds the code to Facebook's dynamic xd_arbiter URL, which we
// can never reproduce server-side — every exchange then fails with subcode 36008.
// Running the dialog as a plain redirect lets US choose the redirect_uri and send
// the identical string back in the exchange, so a mismatch is impossible.

/** Exchange an authorization code using an explicit, known redirect_uri. */
export async function exchangeCodeWithRedirect(code: string, redirectUri: string): Promise<TokenResponse> {
  const url = new URL(`${graphBase()}/oauth/access_token`);
  url.searchParams.set('client_id', metaConfig.appId);
  url.searchParams.set('client_secret', metaConfig.appSecret);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('code', code);

  const res = await fetch(url, { method: 'GET' });
  const text = await res.text();
  if (!res.ok) throw new Error(`Token exchange failed (${res.status}) using redirect_uri="${redirectUri}": ${text}`);
  return JSON.parse(text) as TokenResponse;
}

/**
 * Which WhatsApp Business Accounts this token was granted, read from the token's
 * granular scopes. Used by the redirect flow, which has no WA_EMBEDDED_SIGNUP
 * postMessage to supply the WABA id.
 */
export async function wabaIdsFromToken(token: string): Promise<string[]> {
  const url = new URL(`${graphBase()}/debug_token`);
  url.searchParams.set('input_token', token);
  url.searchParams.set('access_token', `${metaConfig.appId}|${metaConfig.appSecret}`);

  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    data?: { granular_scopes?: Array<{ scope?: string; target_ids?: string[] }> };
  };
  const scopes = json.data?.granular_scopes ?? [];
  const wa =
    scopes.find((s) => s.scope === 'whatsapp_business_management') ??
    scopes.find((s) => s.scope === 'whatsapp_business_messaging');
  return wa?.target_ids ?? [];
}

export interface TokenInfo {
  isValid: boolean;
  /** SYSTEM_USER tokens survive Facebook logouts and integration removals; USER tokens do not. */
  type: string | null;
  /** Epoch seconds; null means the token never expires. */
  expiresAt: number | null;
  /** WABAs this token was granted, from its granular scopes. */
  wabaIds: string[];
  /** Meta's reason when the token is invalid. */
  error: string | null;
}

/** What Meta knows about a token: validity, kind, expiry and granted WABAs. */
export async function inspectToken(token: string): Promise<TokenInfo> {
  const url = new URL(`${graphBase()}/debug_token`);
  url.searchParams.set('input_token', token);
  url.searchParams.set('access_token', `${metaConfig.appId}|${metaConfig.appSecret}`);

  const res = await fetch(url, { method: 'GET', cache: 'no-store' });
  const json = (await res.json().catch(() => ({}))) as {
    data?: {
      is_valid?: boolean;
      type?: string;
      expires_at?: number;
      error?: { message?: string };
      granular_scopes?: Array<{ scope?: string; target_ids?: string[] }>;
    };
    error?: { message?: string };
  };

  const d = json.data;
  if (!res.ok || !d) {
    return { isValid: false, type: null, expiresAt: null, wabaIds: [], error: json.error?.message ?? `debug_token failed (${res.status})` };
  }
  const scopes = d.granular_scopes ?? [];
  const wa =
    scopes.find((s) => s.scope === 'whatsapp_business_management') ??
    scopes.find((s) => s.scope === 'whatsapp_business_messaging');
  return {
    isValid: Boolean(d.is_valid),
    type: d.type ?? null,
    expiresAt: d.expires_at || null,
    wabaIds: wa?.target_ids ?? [],
    error: d.error?.message ?? null,
  };
}
