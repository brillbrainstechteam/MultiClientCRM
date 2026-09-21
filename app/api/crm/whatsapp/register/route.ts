import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { decrypt, encrypt } from '@/lib/crypto';
import { registerPhoneNumber } from '@/lib/meta/graph';

/**
 * Complete Cloud API registration for an existing number that already has
 * two-step verification enabled — the client enters their own 6-digit PIN.
 * (New numbers are registered automatically during /api/auth/meta/exchange.)
 */
const schema = z.object({ phoneNumberId: z.string().min(1), pin: z.string().regex(/^\d{6}$/, 'PIN must be 6 digits.') });

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input.' }, { status: 400 });
  const { phoneNumberId, pin } = parsed.data;

  const account = await prisma.whatsAppAccount.findFirst({
    where: { tenantId: user.tenantId, phoneNumberId },
  });
  if (!account?.accessToken) return NextResponse.json({ error: 'Number not found or not connected.' }, { status: 404 });

  const reg = await registerPhoneNumber(phoneNumberId, decrypt(account.accessToken), pin);
  if (!reg.ok) {
    return NextResponse.json(
      { error: reg.pinRequired ? 'That PIN was not accepted. Check your number’s 2-step verification PIN.' : reg.error ?? 'Registration failed.' },
      { status: 400 },
    );
  }

  await prisma.whatsAppAccount.update({
    where: { id: account.id },
    data: { twoStepPin: encrypt(pin), statusReason: null },
  });
  await prisma.onboardingSession.updateMany({ where: { tenantId: user.tenantId }, data: { status: 'ready' } });

  return NextResponse.json({ ok: true });
}
