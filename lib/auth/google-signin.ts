/**
 * Google Sign-In (authenticate into TalkTrack). Separate from the Google
 * Contacts integration (lib/crm/google.ts): it uses only the basic identity
 * scopes and its own redirect URI, but shares the same OAuth client
 * (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).
 *
 * Policy: sign in EXISTING members only — we match a User by the Google email;
 * we never create an account from a Google login.
 */
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? '';

const SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

export function googleSignInConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

/** Must exactly match an Authorized redirect URI in the Google console. */
export function signInRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, '')}/api/auth/google/signin/callback`;
}

export function buildSignInUrl(origin: string, state: string): string {
  const p = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: signInRedirectUri(origin),
    response_type: 'code',
    scope: SCOPES,
    access_type: 'online',
    include_granted_scopes: 'true',
    prompt: 'select_account',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

/** Exchange the auth code for tokens; we only need the id_token (identity). */
export async function exchangeSignInCode(code: string, origin: string): Promise<{ idToken?: string }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: signInRedirectUri(origin),
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
  const t = (await res.json()) as { id_token?: string };
  return { idToken: t.id_token };
}

/** Email + verified flag from a Google id_token (received over TLS from Google). */
export function identityFromIdToken(idToken?: string): { email: string | null; emailVerified: boolean } {
  if (!idToken) return { email: null, emailVerified: false };
  try {
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString('utf8')) as { email?: string; email_verified?: boolean | string };
    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : null;
    const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
    return { email, emailVerified };
  } catch {
    return { email: null, emailVerified: false };
  }
}
