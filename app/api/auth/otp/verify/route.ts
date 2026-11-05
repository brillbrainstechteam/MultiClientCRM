import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { phoneKey } from '@/lib/auth/identifier';
import { createSession } from '@/lib/auth/session';
import { audit } from '@/lib/crm/audit';
import { messageCentralConfigured, validateOtp } from '@/lib/sms/message-central';
import { PENDING_COOKIE, encodePending, pendingCookieOptions } from '@/lib/auth/pending-signup';

/**
 * Finish OTP login: validate the code, then sign in the active member who owns
 * that mobile number. No account is created here.
 */
export async function POST(req: Request) {
  if (!messageCentralConfigured()) {
    return NextResponse.json({ error: 'OTP login is not configured on the server yet.' }, { status: 503 });
  }
  const b = (await req.json().catch(() => ({}))) as { verificationId?: string; code?: string; mobile?: string; intent?: string };
  const signup = b.intent === 'signup';
  const key = phoneKey(typeof b.mobile === 'string' ? b.mobile : '');
  const code = (typeof b.code === 'string' ? b.code : '').trim();
  const verificationId = typeof b.verificationId === 'string' ? b.verificationId : '';
  if (!key || !code || !verificationId) return NextResponse.json({ error: 'Enter the code sent to your mobile.' }, { status: 400 });

  let result;
  try {
    result = await validateOtp(verificationId, code, key);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not verify the code.' }, { status: 502 });
  }
  if (!result.verified) return NextResponse.json({ error: result.error ?? 'That code is incorrect.' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { phone: key }, select: { id: true, tenantId: true, status: true } });
  if (user && user.status === 'active') {
    await createSession(user.id);
    await audit({ tenantId: user.tenantId, actorId: user.id, action: 'auth.otp_signin', targetType: 'user', targetId: user.id });
    return NextResponse.json({ ok: true, redirect: '/crm/dashboard' });
  }

  // No account yet: signup → stash the verified phone and collect business details.
  if (signup) {
    const store = await cookies();
    store.set(PENDING_COOKIE, encodePending({ provider: 'otp', phone: key }), pendingCookieOptions);
    return NextResponse.json({ ok: true, redirect: '/signup/details' });
  }
  return NextResponse.json({ error: 'No active account found for that mobile number.' }, { status: 404 });
}
