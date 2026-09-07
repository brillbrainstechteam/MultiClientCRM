import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { graphBase } from '@/lib/meta/config';

/**
 * Send a WhatsApp text message on behalf of the signed-in tenant, using their
 * connected number's token, then record it as an outbound Message.
 * Body: { to: string (E.164, no '+'), text: string }
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { to?: string; text?: string } | null;
  const to = body?.to?.replace(/[^\d]/g, '');
  const text = body?.text?.trim();
  if (!to || !text) return NextResponse.json({ error: 'Provide a recipient and a message.' }, { status: 400 });

  const account = await prisma.whatsAppAccount.findFirst({
    where: { tenantId: user.tenantId, status: 'connected' },
    orderBy: { connectedAt: 'desc' },
  });
  if (!account?.phoneNumberId || !account.accessToken) {
    return NextResponse.json({ error: 'No connected WhatsApp number.' }, { status: 400 });
  }

  const token = decrypt(account.accessToken);
  const res = await fetch(`${graphBase()}/${account.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
  });
  const json = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    return NextResponse.json({ error: json?.error?.message ?? 'Send failed.' }, { status: 502 });
  }

  const waMessageId: string | null = json?.messages?.[0]?.id ?? null;
  const convo = await prisma.conversation.upsert({
    where: { tenantId_phoneNumberId_contactPhone: { tenantId: user.tenantId, phoneNumberId: account.phoneNumberId, contactPhone: to } },
    update: { lastMessageAt: new Date() },
    create: { tenantId: user.tenantId, phoneNumberId: account.phoneNumberId, contactPhone: to, lastMessageAt: new Date() },
  });
  await prisma.message.create({
    data: { conversationId: convo.id, waMessageId, direction: 'outbound', type: 'text', text, status: 'sent' },
  });
  await prisma.contact.upsert({
    where: { tenantId_phone: { tenantId: user.tenantId, phone: to } },
    update: { lastMessageAt: new Date() },
    create: { tenantId: user.tenantId, phone: to, lastMessageAt: new Date() },
  });

  return NextResponse.json({ ok: true, conversationId: convo.id });
}
