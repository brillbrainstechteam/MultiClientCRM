import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { phoneKey } from '@/lib/auth/identifier';
import { messageCentralConfigured, sendOtp } from '@/lib/sms/message-central';

/**
 * Start OTP login: send a code to a mobile number that belongs to an active
 * member. Returns a verificationId the client passes back to /verify.
 */
export async function POST(req: Request) {
  if (!messageCentralConfigured()) {
    return NextResponse.json({ error: 'OTP login is not configured on the server yet.' }, { status: 503 });
  }
  const b = (await req.json().catch(() => ({}))) as { mobile?: string; intent?: string };
  const key = phoneKey(typeof b.mobile === 'string' ? b.mobile : '');
  if (!key) return NextResponse.json({ error: 'Enter a valid mobile number.' }, { status: 400 });
  const signup = b.intent === 'signup';

  // For login, only members can get an OTP (don't waste SMS on unknown numbers).
  // For signup, we send to any number — the account is created after Business Details.
  if (!signup) {
    const user = await prisma.user.findUnique({ where: { phone: key }, select: { id: true, status: true } });
    if (!user || user.status !== 'active') {
      return NextResponse.json({ error: 'No active account found for that mobile number.' }, { status: 404 });
    }
  }

  try {
    const verificationId = await sendOtp(key);
    return NextResponse.json({ ok: true, verificationId, mobile: key });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not send the code.' }, { status: 502 });
  }
}
