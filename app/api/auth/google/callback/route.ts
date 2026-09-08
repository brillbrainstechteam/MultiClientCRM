import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { exchangeCode, emailFromIdToken } from '@/lib/crm/google';

/** Where to land the user after the OAuth round-trip (the Imports & Sync hub). */
const done = (req: Request, params: Record<string, string>) => {
  const url = new URL('/crm/contacts/imports', req.url);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
};

/** Google OAuth callback: validate state, exchange the code, persist the connection. */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL('/login', req.url));

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  if (error) return done(req, { googleAuth: 'error', reason: error });

  const store = await cookies();
  const expectedState = store.get('g_oauth_state')?.value;
  store.delete('g_oauth_state');
  if (!code || !state || !expectedState || state !== expectedState) {
    return done(req, { googleAuth: 'error', reason: 'state' });
  }

  try {
    const t = await exchangeCode(code, url.origin);
    const email = emailFromIdToken(t.id_token) ?? 'google-account';
    const expiresAt = new Date(Date.now() + t.expires_in * 1000);

    await prisma.googleConnection.upsert({
      where: { tenantId: user.tenantId },
      create: {
        tenantId: user.tenantId,
        email,
        accessToken: t.access_token,
        refreshToken: t.refresh_token ?? null,
        expiresAt,
        scope: t.scope,
      },
      update: {
        email,
        accessToken: t.access_token,
        // Google only returns a refresh_token on first consent; keep the stored one otherwise.
        ...(t.refresh_token ? { refreshToken: t.refresh_token } : {}),
        expiresAt,
        scope: t.scope,
      },
    });

    return done(req, { googleAuth: 'connected' });
  } catch {
    return done(req, { googleAuth: 'error', reason: 'exchange' });
  }
}
