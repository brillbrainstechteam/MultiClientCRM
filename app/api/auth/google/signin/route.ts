import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { buildSignInUrl, googleSignInConfigured } from '@/lib/auth/google-signin';
import { publicOrigin } from '@/lib/http/origin';

/** Start Google Sign-In: set an anti-CSRF state cookie, redirect to Google consent. */
export async function GET(req: Request) {
  if (!googleSignInConfigured()) {
    return NextResponse.redirect(new URL('/login?error=google_unconfigured', req.url));
  }
  const origin = publicOrigin(req);
  const state = randomBytes(16).toString('base64url');
  // login (default) = sign in an existing member; signup = create on first use.
  const mode = new URL(req.url).searchParams.get('mode') === 'signup' ? 'signup' : 'login';

  const store = await cookies();
  const opts = { httpOnly: true as const, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 600 };
  store.set('g_signin_state', state, opts);
  store.set('g_signin_mode', mode, opts);

  return NextResponse.redirect(buildSignInUrl(origin, state));
}
