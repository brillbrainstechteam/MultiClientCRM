import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

const digits = (s: string) => (s ?? '').replace(/\D/g, '');

/**
 * Inbox hydration for the embedded CRM. Returns the tenant's real conversations
 * + messages, with each conversation linked to its CrmContact (by mobile) and to
 * the workspace WhatsApp number id (the WhatsAppAccount id, matching bootstrap).
 * The prototype maps these into its InboxConversation/InboxMessage shapes.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const tenantId = user.tenantId;

  const [accounts, conversations, crmContacts] = await Promise.all([
    prisma.whatsAppAccount.findMany({ where: { tenantId }, orderBy: { connectedAt: 'desc' } }),
    prisma.conversation.findMany({
      where: { tenantId },
      orderBy: { lastMessageAt: 'desc' },
      include: { messages: { orderBy: { at: 'asc' } } },
      take: 200,
    }),
    prisma.crmContact.findMany({ where: { tenantId }, select: { id: true, mobile: true } }),
  ]);

  // phoneNumberId -> workspace number id (WhatsAppAccount.id, as bootstrap uses).
  const numberByPhoneId = new Map(accounts.filter((a) => a.phoneNumberId).map((a) => [a.phoneNumberId!, a.id]));
  const connected = accounts.find((a) => a.status === 'connected');
  const fallbackNumberId = connected?.id ?? accounts[0]?.id ?? '';

  // normalised mobile digits -> CrmContact id.
  const crmByDigits = new Map(crmContacts.map((c) => [digits(c.mobile), c.id]));

  const mapped = conversations.map((c) => {
    const d = digits(c.contactPhone);
    const lastInbound = [...c.messages].reverse().find((m) => m.direction === 'inbound');
    return {
      id: c.id,
      whatsappNumberId: numberByPhoneId.get(c.phoneNumberId) ?? fallbackNumberId,
      contactId: crmByDigits.get(d) ?? null,
      rawMobile: c.contactPhone ? `+${c.contactPhone}` : null,
      contactName: c.contactName ?? null,
      firstMessageAt: (c.messages[0]?.at ?? c.createdAt).toISOString?.() ?? String(c.messages[0]?.at ?? c.createdAt),
      lastMessageAt: c.lastMessageAt.toISOString(),
      lastInboundAt: lastInbound ? lastInbound.at.toISOString() : null,
      messages: c.messages.map((m) => ({
        id: m.id,
        direction: m.direction,
        text: m.text ?? '',
        status: m.status ?? null,
        at: m.at.toISOString(),
      })),
    };
  });

  return NextResponse.json({
    connected: Boolean(connected),
    numberId: fallbackNumberId,
    conversations: mapped,
  });
}
