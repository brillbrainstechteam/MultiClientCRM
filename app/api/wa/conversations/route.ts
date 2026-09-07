import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

/** Returns the signed-in tenant's connection status + conversations with messages. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const account = await prisma.whatsAppAccount.findFirst({
    where: { tenantId: user.tenantId, status: 'connected' },
    orderBy: { connectedAt: 'desc' },
  });

  const conversations = await prisma.conversation.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { lastMessageAt: 'desc' },
    include: { messages: { orderBy: { at: 'asc' } } },
    take: 100,
  });

  // Attach the Contact record (Customer-360 source) by phone.
  const contacts = await prisma.contact.findMany({ where: { tenantId: user.tenantId } });
  const byPhone = new Map(contacts.map((c) => [c.phone, c]));

  return NextResponse.json({
    connected: Boolean(account),
    number: account?.displayPhone ?? null,
    conversations: conversations.map((c) => {
      const contact = byPhone.get(c.contactPhone);
      return {
        id: c.id,
        contactPhone: c.contactPhone,
        contactName: c.contactName,
        lastMessageAt: c.lastMessageAt,
        contact: contact
          ? {
              id: contact.id,
              name: contact.name,
              email: contact.email,
              company: contact.company,
              city: contact.city,
              notes: contact.notes,
              tags: contact.tags,
            }
          : null,
        messages: c.messages.map((m) => ({
          id: m.id,
          direction: m.direction,
          text: m.text,
          status: m.status,
          at: m.at,
        })),
      };
    }),
  });
}
