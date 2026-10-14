import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';
import { visibleUserIds, canSeeContact } from '@/lib/crm/scope';
import { propagateContactOwner } from '@/lib/crm/assignment';

/**
 * Set one contact's owner slots.
 *
 * Body: { ownerId?: string, marketingOwnerId?: string | null }
 *
 * Both slots can be set in one call, which is how the UI presents them. Changing
 * the sales owner also moves that contact's open conversations to the new owner
 * (see lib/crm/assignment.ts for the exact rule — a thread deliberately handed
 * to somebody else stays put). The marketing slot grants visibility but does not
 * touch conversations, because marketing does not answer the chat.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!['owner', 'admin', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Your role cannot reassign contacts.' }, { status: 403 });
  }
  const { id } = await params;

  const b = (await req.json().catch(() => null)) as
    { ownerId?: unknown; marketingOwnerId?: unknown } | null;
  if (!b) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });

  const contact = await prisma.crmContact.findFirst({
    where: { id, tenantId: user.tenantId },
    select: { id: true, name: true, mobile: true, ownerId: true, marketingOwnerId: true },
  });
  if (!contact) return NextResponse.json({ error: 'Contact not found.' }, { status: 404 });

  const vis = await visibleUserIds(user);
  if (!canSeeContact(vis, contact)) {
    return NextResponse.json({ error: 'This contact is not assigned to you.' }, { status: 403 });
  }

  const member = async (value: unknown) => {
    if (typeof value !== 'string' || !value) return null;
    return prisma.user.findFirst({
      where: { id: value, tenantId: user.tenantId, status: 'active' },
      select: { id: true, name: true },
    });
  };

  const data: Record<string, unknown> = {};
  let newOwnerId: string | null = null;

  if (b.ownerId !== undefined) {
    const m = await member(b.ownerId);
    if (!m) return NextResponse.json({ error: 'Choose an active team member as the sales owner.' }, { status: 400 });
    newOwnerId = m.id;
    data.ownerId = m.id;
  }
  if (b.marketingOwnerId !== undefined) {
    if (b.marketingOwnerId === null || b.marketingOwnerId === '') {
      data.marketingOwnerId = null;
    } else {
      const m = await member(b.marketingOwnerId);
      if (!m) return NextResponse.json({ error: 'Choose an active team member as the marketing owner.' }, { status: 400 });
      data.marketingOwnerId = m.id;
    }
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 });
  }
  data.lastActivityAt = new Date();

  await prisma.crmContact.update({ where: { id }, data });

  let conversationsMoved = 0;
  if (newOwnerId && newOwnerId !== contact.ownerId) {
    conversationsMoved = await propagateContactOwner({
      tenantId: user.tenantId,
      contacts: [{ id: contact.id, mobile: contact.mobile, ownerId: contact.ownerId }],
      newOwnerId,
      actorId: user.id,
    });
  }

  await audit({
    tenantId: user.tenantId,
    actorId: user.id,
    action: 'contact.assigned',
    targetType: 'contact',
    targetId: id,
    detail: [
      newOwnerId ? `sales -> ${newOwnerId}` : null,
      b.marketingOwnerId !== undefined ? `marketing -> ${data.marketingOwnerId ?? 'cleared'}` : null,
      conversationsMoved ? `${conversationsMoved} conversation(s) followed` : null,
    ].filter(Boolean).join('; '),
  });

  return NextResponse.json({
    ok: true,
    ownerId: (data.ownerId as string | undefined) ?? contact.ownerId,
    marketingOwnerId: b.marketingOwnerId !== undefined
      ? (data.marketingOwnerId as string | null)
      : contact.marketingOwnerId,
    conversationsMoved,
  });
}
