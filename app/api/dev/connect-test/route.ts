import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { encrypt } from '@/lib/crypto';

/**
 * DEV ONLY — connect the WhatsApp *test* number to the signed-in tenant using
 * the values in .env (WHATSAPP_TEST_PHONE_NUMBER_ID / _WABA_ID / _TOKEN).
 * Lets you exercise the inbox + sending before Embedded Signup is approved.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const phoneNumberId = process.env.WHATSAPP_TEST_PHONE_NUMBER_ID;
  const wabaId = process.env.WHATSAPP_TEST_WABA_ID ?? null;
  const token = process.env.WHATSAPP_TEST_TOKEN;

  if (!phoneNumberId || !token) {
    return NextResponse.json(
      { error: 'Set WHATSAPP_TEST_PHONE_NUMBER_ID and WHATSAPP_TEST_TOKEN in .env first.' },
      { status: 400 },
    );
  }

  const existing = await prisma.whatsAppAccount.findFirst({ where: { tenantId: user.tenantId, phoneNumberId } });
  const data = {
    wabaId,
    phoneNumberId,
    displayPhone: 'Test number',
    verifiedName: 'Test WhatsApp Business Account',
    accessToken: encrypt(token),
    status: 'connected',
    connectedAt: new Date(),
  };

  if (existing) {
    await prisma.whatsAppAccount.update({ where: { id: existing.id }, data });
  } else {
    await prisma.whatsAppAccount.create({ data: { tenantId: user.tenantId, ...data } });
  }

  return NextResponse.json({ ok: true });
}
