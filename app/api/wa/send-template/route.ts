import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { graphBase } from '@/lib/meta/config';
import { checkLimit } from '@/lib/billing/limits';

/**
 * Send one approved template to one customer.
 *
 * This is the re-engagement path: once the 24-hour customer service window has
 * closed, WhatsApp accepts nothing else, so this is the only way an agent can
 * reply at all. It was previously faked in the UI — an optimistic bubble that
 * flipped to "sent" after 800ms while nothing left the building — which is the
 * worst possible failure for an inbox, because the agent believes they replied
 * and the customer is simply never answered.
 *
 * Body: { to, templateName, language, bodyParams?, headerMediaUrl?, headerMediaType? }
 *
 * Meta's own error is passed straight through. "Template not found" and
 * "parameter count mismatch" are the two an operator will actually hit, and
 * both are actionable — dressing them up as "Send failed" is not.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const b = (await req.json().catch(() => null)) as {
    to?: string; templateName?: string; language?: string;
    bodyParams?: unknown; headerMediaUrl?: string; headerMediaType?: string;
  } | null;

  const to = b?.to?.replace(/\D/g, '');
  const templateName = b?.templateName?.trim();
  const language = b?.language?.trim() || 'en';
  if (!to) return NextResponse.json({ error: 'Provide a recipient.' }, { status: 400 });
  if (!templateName) return NextResponse.json({ error: 'Choose a template to send.' }, { status: 400 });

  const allowance = await checkLimit(user.tenantId, 'messages');
  if (!allowance.allowed) {
    return NextResponse.json({ error: allowance.reason, code: 'plan_limit' }, { status: 402 });
  }

  const account = await prisma.whatsAppAccount.findFirst({
    where: { tenantId: user.tenantId, status: 'connected' },
    orderBy: { connectedAt: 'desc' },
  });
  if (!account?.phoneNumberId || !account.accessToken) {
    return NextResponse.json({ error: 'No connected WhatsApp number.' }, { status: 400 });
  }

  const params = Array.isArray(b?.bodyParams) ? b.bodyParams.map(String) : [];
  const headerType = b?.headerMediaType;
  const headerComponent = b?.headerMediaUrl && (headerType === 'image' || headerType === 'video' || headerType === 'document')
    ? [{ type: 'header', parameters: [{ type: headerType, [headerType]: { link: b.headerMediaUrl } }] }]
    : [];

  const components = [
    ...headerComponent,
    ...(params.length
      ? [{ type: 'body', parameters: params.map((t) => ({ type: 'text', text: t })) }]
      : []),
  ];

  const res = await fetch(`${graphBase()}/${account.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${decrypt(account.accessToken)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: { name: templateName, language: { code: language }, components },
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    messages?: Array<{ id?: string }>; error?: { message?: string };
  };
  if (!res.ok) {
    return NextResponse.json({ error: json.error?.message ?? 'Send failed.' }, { status: 502 });
  }

  const waMessageId = json.messages?.[0]?.id ?? null;
  const convo = await prisma.conversation.upsert({
    where: {
      tenantId_phoneNumberId_contactPhone: {
        tenantId: user.tenantId, phoneNumberId: account.phoneNumberId, contactPhone: to,
      },
    },
    update: { lastMessageAt: new Date() },
    create: {
      tenantId: user.tenantId, phoneNumberId: account.phoneNumberId,
      contactPhone: to, lastMessageAt: new Date(),
    },
  });

  // Store the resolved text, not the raw template, so the thread reads as what
  // the customer actually received.
  let text = templateName;
  if (params.length) text = `${templateName}: ${params.join(' · ')}`;

  await prisma.message.create({
    data: {
      conversationId: convo.id,
      waMessageId,
      direction: 'outbound',
      type: 'template',
      text,
      status: 'sent',
      source: 'crm_agent',
    },
  });

  return NextResponse.json({ ok: true, waMessageId });
}
