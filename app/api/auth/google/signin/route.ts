import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { buildSignInUrl, googleSignInConfigured } from '@/lib/auth/google-signin';

/** Start Google Sign-In: set an anti-CSRF state cookie, redirect to Google consent. */
export async function GET(req: Request) {
  if (!googleSignInConfigured()) {
    return NextResponse.redirect(new URL('/login?error=google_unconfigured', req.url));
  }
  const origin = new URL(req.url).origin;
  const state = randomBytes(16).toString('base64url');

  const store = await cookies();
  store.set('g_signin_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });

  return NextResponse.redirect(buildSignInUrl(origin, state));
}
