import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/auth/session';
import { metaConfig } from '@/lib/meta/config';

/** The redirect_uri we own — must be identical here and in the exchange. */
export function metaRedirectUri(origin: string): string {
  return `${origin.replace(/\/+$/, '')}/api/auth/meta/callback`;
}

/**
 * Start Embedded Signup as a server-side redirect (not the JS-SDK popup).
 * We choose the redirect_uri, so the callback can exchange the code with the
 * exact same value — making OAuthException 36008 (redirect_uri mismatch)
 * structurally impossible.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL('/login', req.url));
  if (!metaConfig.appId || !metaConfig.configId) {
    return NextResponse.json({ error: 'Meta app is not configured on the server.' }, { status: 500 });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get('path') ?? 'existing';
  const state = randomBytes(16).toString('base64url');

  const store = await cookies();
  store.set('meta_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });

  const extras: Record<string, unknown> = { setup: {}, sessionInfoVersion: '3' };
  if (path === 'coexistence' && metaConfig.coexistenceFeature) {
    extras.featureType = metaConfig.coexistenceFeature;
  }

  const dialog = new URL(`https://www.facebook.com/${metaConfig.graphVersion}/dialog/oauth`);
  dialog.searchParams.set('client_id', metaConfig.appId);
  dialog.searchParams.set('config_id', metaConfig.configId);
  dialog.searchParams.set('response_type', 'code');
  dialog.searchParams.set('override_default_response_type', 'true');
  dialog.searchParams.set('redirect_uri', metaRedirectUri(url.origin));
  dialog.searchParams.set('state', state);
  dialog.searchParams.set('extras', JSON.stringify(extras));

  return NextResponse.redirect(dialog.toString());
}
