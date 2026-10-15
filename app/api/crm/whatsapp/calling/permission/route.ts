import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { audit } from '@/lib/crm/audit';
import { checkCallGate, askForCallPermission } from '@/lib/whatsapp/calling';

/**
 * Call permission (Part 2 doc §5.3, §5.4).
 *
 * GET  — may we ring this customer right now, and if not, why, in a sentence.
 * POST — ask them.
 *
 * The agent never sees `permission_status=PENDING`. They see "You need Priya's
 * permission before making a WhatsApp call" and a button, which is the whole
 * point of the gate living here rather than in the component.
 */

async function account(tenantId: string, phoneNumberId?: string | null) {
  return prisma.whatsAppAccount.findFirst({
    where: phoneNumberId ? { tenantId, phoneNumberId } : { tenantId, status: 'connected' },
    orderBy: { connectedAt: 'desc' },
    select: { phoneNumberId: true, accessToken: true },
  });
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const url = new URL(req.url);
  const contactPhone = (url.searchParams.get('phone') ?? '').replace(/[^\d]/g, '');
  if (!contactPhone) return NextResponse.json({ error: 'A customer number is required.' }, { status: 400 });

  const acc = await account(user.tenantId, url.searchParams.get('phoneNumberId'));
  if (!acc?.phoneNumberId || !acc.accessToken) {
    return NextResponse.json({ error: 'Connect a WhatsApp number first.' }, { status: 409 });
  }

  const contact = await prisma.contact.findFirst({
    where: { tenantId: user.tenantId, phone: { contains: contactPhone.slice(-10) } },
    select: { name: true },
  });

  const gate = await checkCallGate({
    tenantId: user.tenantId,
    phoneNumberId: acc.phoneNumberId,
    token: decrypt(acc.accessToken),
    contactPhone,
    contactName: contact?.name ?? null,
  });

  return NextResponse.json({
    ...gate,
    expiresAt: gate.expiresAt?.toISOString() ?? null,
    retryAfter: gate.retryAfter?.toISOString() ?? null,
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const b = (await req.json().catch(() => null)) as {
    phone?: string; phoneNumberId?: string; text?: string; templateName?: string;
  } | null;
  const contactPhone = (b?.phone ?? '').replace(/[^\d]/g, '');
  if (!contactPhone) return NextResponse.json({ error: 'A customer number is required.' }, { status: 400 });

  const acc = await account(user.tenantId, b?.phoneNumberId);
  if (!acc?.phoneNumberId || !acc.accessToken) {
    return NextResponse.json({ error: 'Connect a WhatsApp number first.' }, { status: 409 });
  }

  const r = await askForCallPermission({
    tenantId: user.tenantId,
    phoneNumberId: acc.phoneNumberId,
    token: decrypt(acc.accessToken),
    contactPhone,
    text: b?.text,
    templateName: b?.templateName,
    byUserId: user.id,
  });

  if (!r.ok) {
    return NextResponse.json(
      { error: r.message, retryAfter: r.retryAfter?.toISOString() ?? null },
      { status: 429 },
    );
  }

  await audit({
    tenantId: user.tenantId, actorId: user.id, action: 'whatsapp.calling.permission_requested',
    targetType: 'contact', targetId: contactPhone, detail: acc.phoneNumberId,
  });

  return NextResponse.json({ ok: true, message: r.message });
}
