import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth/session';
import { audit } from '@/lib/crm/audit';
import { exchangeSignInCode, identityFromIdToken } from '@/lib/auth/google-signin';
import { publicOrigin } from '@/lib/http/origin';
import { PENDING_COOKIE, encodePending, pendingCookieOptions } from '@/lib/auth/pending-signup';

/**
 * Google Sign-In callback. Verify state, exchange the code, read the verified
 * email, and sign in the EXISTING member with that email. No account is ever
 * created from a Google login.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  // The redirect_uri sent to Google MUST match what the start route used.
  const origin = publicOrigin(req);
  const back = (error: string) => NextResponse.redirect(new URL(`/login?error=${error}`, origin));

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (url.searchParams.get('error') || !code) return back('google_cancelled');

  const store = await cookies();
  const expected = store.get('g_signin_state')?.value;
  const mode = store.get('g_signin_mode')?.value === 'signup' ? 'signup' : 'login';
  store.delete('g_signin_state');
  store.delete('g_signin_mode');
  if (!state || !expected || state !== expected) return back('google_state');

  let email: string | null = null;
  let emailVerified = false;
  try {
    const { idToken } = await exchangeSignInCode(code, origin);
    const id = identityFromIdToken(idToken);
    email = id.email;
    emailVerified = id.emailVerified;
  } catch {
    return back('google_failed');
  }
  if (!email || !emailVerified) return back('google_email');

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, tenantId: true, status: true } });
  if (!user || user.status !== 'active') {
    // No account: signup mode → stash the verified email and collect business
    // details; login mode → tell them to ask their admin.
    if (mode === 'signup') {
      store.set(PENDING_COOKIE, encodePending({ provider: 'google', email }), pendingCookieOptions);
      return NextResponse.redirect(new URL('/signup/details', origin));
    }
    return back('no_account');
  }

  await createSession(user.id);
  await audit({ tenantId: user.tenantId, actorId: user.id, action: 'auth.google_signin', targetType: 'user', targetId: user.id });
  return NextResponse.redirect(new URL('/crm/dashboard', origin));
}
