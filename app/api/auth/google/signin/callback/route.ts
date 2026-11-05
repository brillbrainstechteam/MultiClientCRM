import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth/session';
import { audit } from '@/lib/crm/audit';
import { exchangeSignInCode, identityFromIdToken } from '@/lib/auth/google-signin';

/**
 * Google Sign-In callback. Verify state, exchange the code, read the verified
 * email, and sign in the EXISTING member with that email. No account is ever
 * created from a Google login.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const back = (error: string) => NextResponse.redirect(new URL(`/login?error=${error}`, origin));

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (url.searchParams.get('error') || !code) return back('google_cancelled');

  const store = await cookies();
  const expected = store.get('g_signin_state')?.value;
  store.delete('g_signin_state');
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
  if (!user || user.status !== 'active') return back('no_account');

  await createSession(user.id);
  await audit({ tenantId: user.tenantId, actorId: user.id, action: 'auth.google_signin', targetType: 'user', targetId: user.id });
  return NextResponse.redirect(new URL('/crm/dashboard', origin));
}
