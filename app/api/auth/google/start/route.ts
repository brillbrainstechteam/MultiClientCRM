import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/auth/session';
import { buildAuthUrl, googleConfigured } from '@/lib/crm/google';

/** Kick off Google OAuth: set an anti-CSRF state cookie and redirect to consent. */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL('/login', req.url));
  if (!googleConfigured()) {
    return NextResponse.json({ error: 'Google integration is not configured on the server.' }, { status: 500 });
  }

  const origin = new URL(req.url).origin;
  const state = randomBytes(16).toString('base64url');

  const store = await cookies();
  store.set('g_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600, // 10 minutes
  });

  return NextResponse.redirect(buildAuthUrl(origin, state));
}
