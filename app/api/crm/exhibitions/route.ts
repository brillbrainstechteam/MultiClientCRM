import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';
import { summariseExhibition } from '@/lib/crm/visits';

/**
 * Exhibitions (PRD §16, EXH-01..05).
 *
 * Exhibitions are a primary source of new leads in this trade, and nothing
 * existed for them. A contact captured at a stall needs tracking through the
 * whole journey afterwards; dumping them into the contact list with
 * `source: 'exhibition'` loses which exhibition, how they were captured, and
 * what became of them.
 */

const MANAGE_ROLES = ['owner', 'admin', 'manager'];
const STATUSES = new Set(['planned', 'running', 'closed']);

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');

  // One exhibition: its contacts and its §21.6 report.
  if (id) {
    const exhibition = await prisma.crmExhibition.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!exhibition) return NextResponse.json({ error: 'Exhibition not found.' }, { status: 404 });

    const rows = await prisma.crmExhibitionContact.findMany({
      where: { tenantId: user.tenantId, exhibitionId: id },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const contacts = await prisma.crmContact.findMany({
      where: { tenantId: user.tenantId, id: { in: rows.map((r) => r.contactId) } },
      select: { id: true, name: true, company: true, mobile: true, city: true, leadStatus: true },
    });
    const byId = new Map(contacts.map((c) => [c.id, c]));

    return NextResponse.json({
      exhibition: {
        id: exhibition.id, name: exhibition.name, venue: exhibition.venue, city: exhibition.city,
        startsAt: exhibition.startsAt.toISOString(),
        endsAt: exhibition.endsAt?.toISOString() ?? null,
        notes: exhibition.notes, status: exhibition.status,
      },
      contacts: rows.map((r) => ({
        id: r.id,
        contactId: r.contactId,
        name: byId.get(r.contactId)?.name ?? 'Unknown',
        company: byId.get(r.contactId)?.company ?? null,
        mobile: byId.get(r.contactId)?.mobile ?? null,
        city: byId.get(r.contactId)?.city ?? null,
        leadStatus: byId.get(r.contactId)?.leadStatus ?? null,
        captureSource: r.captureSource,
        journeyStatus: r.journeyStatus,
        channelsUsed: r.channelsUsed,
        volumeGrams: r.volumeGrams,
        routeToCalling: r.routeToCalling,
        routeToVisit: r.routeToVisit,
        notes: r.notes,
      })),
      report: summariseExhibition(rows),
      canEdit: MANAGE_ROLES.includes(user.role),
    });
  }

  // The list, each with a headline count.
  const exhibitions = await prisma.crmExhibition.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { startsAt: 'desc' },
    take: 200,
  });
  const counts = await prisma.crmExhibitionContact.groupBy({
    by: ['exhibitionId'],
    where: { tenantId: user.tenantId },
    _count: true,
  });
  const countBy = new Map(counts.map((c) => [c.exhibitionId, c._count as number]));

  return NextResponse.json({
    exhibitions: exhibitions.map((e) => ({
      id: e.id, name: e.name, venue: e.venue, city: e.city,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt?.toISOString() ?? null,
      status: e.status, notes: e.notes,
      contactCount: countBy.get(e.id) ?? 0,
    })),
    canEdit: MANAGE_ROLES.includes(user.role),
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!MANAGE_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Only an owner, admin or manager can add an exhibition.' }, { status: 403 });
  }

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = (typeof b?.name === 'string' ? b.name : '').trim();
  if (!name) return NextResponse.json({ error: 'Give the exhibition a name.' }, { status: 400 });

  const startsAt = typeof b?.startsAt === 'string' ? new Date(b.startsAt) : null;
  if (!startsAt || isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: 'Pick a start date.' }, { status: 400 });
  }
  const endsAt = typeof b?.endsAt === 'string' && b.endsAt ? new Date(b.endsAt) : null;
  if (endsAt && isNaN(endsAt.getTime())) {
    return NextResponse.json({ error: 'That end date is not valid.' }, { status: 400 });
  }
  if (endsAt && endsAt < startsAt) {
    return NextResponse.json({ error: 'The exhibition cannot end before it starts.' }, { status: 400 });
  }

  const created = await prisma.crmExhibition.create({
    data: {
      tenantId: user.tenantId, name,
      venue: (typeof b?.venue === 'string' ? b.venue.trim() : '') || null,
      city: (typeof b?.city === 'string' ? b.city.trim() : '') || null,
      startsAt, endsAt,
      notes: (typeof b?.notes === 'string' ? b.notes.trim() : '') || null,
      status: STATUSES.has(String(b?.status)) ? String(b!.status) : 'planned',
      createdByUserId: user.id,
    },
  });

  await audit({
    tenantId: user.tenantId, actorId: user.id, action: 'crm.exhibition.created',
    targetType: 'exhibition', targetId: created.id, detail: name,
  });

  return NextResponse.json({ id: created.id, name: created.name }, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!MANAGE_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Only an owner, admin or manager can edit an exhibition.' }, { status: 403 });
  }

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = typeof b?.id === 'string' ? b.id : '';
  if (!id) return NextResponse.json({ error: 'An exhibition id is required.' }, { status: 400 });

  const existing = await prisma.crmExhibition.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof b?.name === 'string' && b.name.trim()) data.name = b.name.trim();
  if ('venue' in b!) data.venue = (typeof b.venue === 'string' ? b.venue.trim() : '') || null;
  if ('city' in b!) data.city = (typeof b.city === 'string' ? b.city.trim() : '') || null;
  if ('notes' in b!) data.notes = (typeof b.notes === 'string' ? b.notes.trim() : '') || null;
  if (STATUSES.has(String(b?.status))) data.status = String(b!.status);
  if (typeof b?.startsAt === 'string') {
    const d = new Date(b.startsAt);
    if (isNaN(d.getTime())) return NextResponse.json({ error: 'That start date is not valid.' }, { status: 400 });
    data.startsAt = d;
  }
  if ('endsAt' in b!) {
    const d = b.endsAt ? new Date(String(b.endsAt)) : null;
    if (d && isNaN(d.getTime())) return NextResponse.json({ error: 'That end date is not valid.' }, { status: 400 });
    data.endsAt = d;
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });

  const updated = await prisma.crmExhibition.update({ where: { id }, data });
  return NextResponse.json({ id: updated.id, status: updated.status });
}
