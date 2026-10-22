import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';

/**
 * External WhatsApp group registry (PRD §9.2, GRP-06).
 *
 * Existing WhatsApp Business App group chats are not synchronised through
 * Coexistence and their history cannot be imported — Meta does not expose it,
 * and the PRD forbids scraping or any workaround that pretends otherwise.
 *
 * So this registers the fact that a group exists, who is in it on our side, and
 * what people report happening in it. Deliberately absent, because none of it
 * would be real: message history, unread counts, response times, delivery
 * state. A log entry here is somebody saying what happened, never WhatsApp
 * telling us.
 */

const MANAGE_ROLES = ['owner', 'admin', 'manager'];
const LOG_KINDS = new Set(['update', 'note', 'order_discussion', 'outcome', 'file']);

function serialize(g: {
  id: string; contactId: string | null; name: string; zoneId: string | null;
  whatsappNumberId: string | null; primaryUserId: string | null;
  backupUserIds: string[]; managerUserId: string | null;
  inviteLink: string | null; notes: string | null; status: string;
  lastManualUpdateAt: Date | null; createdAt: Date;
}) {
  return {
    id: g.id,
    contactId: g.contactId,
    name: g.name,
    zoneId: g.zoneId,
    whatsappNumberId: g.whatsappNumberId,
    primaryUserId: g.primaryUserId,
    backupUserIds: g.backupUserIds,
    managerUserId: g.managerUserId,
    inviteLink: g.inviteLink,
    notes: g.notes,
    status: g.status,
    lastManualUpdateAt: g.lastManualUpdateAt?.toISOString() ?? null,
    createdAt: g.createdAt.toISOString(),
    // Stated on every row so no caller can mistake this for a synced thread.
    coverage: 'manual_external' as const,
  };
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const url = new URL(req.url);
  const contactId = url.searchParams.get('contactId');
  const status = url.searchParams.get('status');

  const groups = await prisma.crmExternalGroup.findMany({
    where: {
      tenantId: user.tenantId,
      ...(contactId ? { contactId } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: 500,
  });

  return NextResponse.json({
    groups: groups.map(serialize),
    note: 'These groups are managed in WhatsApp. Their messages are not synchronised into TalkTrack.',
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = (typeof b?.name === 'string' ? b.name : '').trim();
  if (!name) return NextResponse.json({ error: 'Give the group a name.' }, { status: 400 });

  const contactId = typeof b?.contactId === 'string' && b.contactId ? b.contactId : null;
  if (contactId) {
    const exists = await prisma.crmContact.findFirst({
      where: { id: contactId, tenantId: user.tenantId }, select: { id: true },
    });
    if (!exists) return NextResponse.json({ error: 'That customer was not found.' }, { status: 400 });
  }

  const created = await prisma.crmExternalGroup.create({
    data: {
      tenantId: user.tenantId,
      contactId,
      name,
      zoneId: typeof b?.zoneId === 'string' && b.zoneId ? b.zoneId : null,
      whatsappNumberId: typeof b?.whatsappNumberId === 'string' && b.whatsappNumberId ? b.whatsappNumberId : null,
      primaryUserId: typeof b?.primaryUserId === 'string' && b.primaryUserId ? b.primaryUserId : null,
      backupUserIds: Array.isArray(b?.backupUserIds) ? b.backupUserIds.map(String).filter(Boolean).slice(0, 20) : [],
      managerUserId: typeof b?.managerUserId === 'string' && b.managerUserId ? b.managerUserId : null,
      inviteLink: (typeof b?.inviteLink === 'string' ? b.inviteLink.trim() : '') || null,
      notes: (typeof b?.notes === 'string' ? b.notes.trim() : '') || null,
      createdByUserId: user.id,
      lastManualUpdateAt: new Date(),
    },
  });

  await audit({
    tenantId: user.tenantId, actorId: user.id, action: 'crm.external_group.registered',
    targetType: 'external_group', targetId: created.id, detail: name,
  });

  return NextResponse.json({ group: serialize(created) }, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = typeof b?.id === 'string' ? b.id : '';
  if (!id) return NextResponse.json({ error: 'A group id is required.' }, { status: 400 });

  const existing = await prisma.crmExternalGroup.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof b?.name === 'string' && b.name.trim()) data.name = b.name.trim();
  if ('contactId' in b!) data.contactId = typeof b.contactId === 'string' && b.contactId ? b.contactId : null;
  if ('zoneId' in b!) data.zoneId = typeof b.zoneId === 'string' && b.zoneId ? b.zoneId : null;
  if ('whatsappNumberId' in b!) data.whatsappNumberId = typeof b.whatsappNumberId === 'string' && b.whatsappNumberId ? b.whatsappNumberId : null;
  if ('primaryUserId' in b!) data.primaryUserId = typeof b.primaryUserId === 'string' && b.primaryUserId ? b.primaryUserId : null;
  if (Array.isArray(b?.backupUserIds)) data.backupUserIds = b.backupUserIds.map(String).filter(Boolean).slice(0, 20);
  if ('managerUserId' in b!) data.managerUserId = typeof b.managerUserId === 'string' && b.managerUserId ? b.managerUserId : null;
  if ('inviteLink' in b!) data.inviteLink = (typeof b.inviteLink === 'string' ? b.inviteLink.trim() : '') || null;
  if ('notes' in b!) data.notes = (typeof b.notes === 'string' ? b.notes.trim() : '') || null;
  if (b?.status === 'active' || b?.status === 'inactive') data.status = b.status;

  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });

  // Any edit is somebody telling us something current about a group we cannot
  // observe, so it refreshes the only freshness signal there is.
  data.lastManualUpdateAt = new Date();

  const updated = await prisma.crmExternalGroup.update({ where: { id }, data });
  return NextResponse.json({ group: serialize(updated) });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!MANAGE_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Only an owner, admin or manager can remove a group.' }, { status: 403 });
  }

  const id = new URL(req.url).searchParams.get('id') ?? '';
  const existing = await prisma.crmExternalGroup.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  await prisma.crmExternalGroup.delete({ where: { id } });
  await audit({
    tenantId: user.tenantId, actorId: user.id, action: 'crm.external_group.removed',
    targetType: 'external_group', targetId: id, detail: existing.name,
  });
  return NextResponse.json({ ok: true });
}
