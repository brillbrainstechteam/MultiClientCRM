import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';
import { visibleUserIds } from '@/lib/crm/scope';
import {
  effectiveStatus, summariseVisits, VISIT_OUTCOME_VALUES, type VisitRow,
} from '@/lib/crm/visits';

/**
 * Field visits (PRD §15, FLD-01..07).
 *
 * A visit used to be a date on the contact plus a call log afterwards, which
 * could not answer "planned vs visited" or "visits pending" at all — there was
 * no record of a visit that had been planned and not made. A planned visit is
 * a row from the moment it is scheduled and the same row is completed later.
 *
 * GET returns the list and the §21.5 report together, because every screen
 * that wants one wants the other.
 */

const MANAGE_ROLES = ['owner', 'admin', 'manager'];

function serialize(v: {
  id: string; contactId: string; assigneeUserId: string | null; zoneId: string | null;
  status: string; plannedAt: Date; visitedAt: Date | null; purpose: string | null;
  catalogueItemIds: string[]; itemsPresented: string | null;
  expenseAmount: number | null; expenseCurrency: string; expenseNote: string | null;
  outcome: string | null; expectedGrams: number | null; actualGrams: number | null;
  discussion: string | null; orderId: string | null;
}, now: Date) {
  return {
    id: v.id,
    contactId: v.contactId,
    assigneeUserId: v.assigneeUserId,
    zoneId: v.zoneId,
    status: v.status,
    // What it actually is right now — a planned visit whose day has passed is
    // reported as missed without the stored row being rewritten.
    effectiveStatus: effectiveStatus(v, now),
    plannedAt: v.plannedAt.toISOString(),
    visitedAt: v.visitedAt?.toISOString() ?? null,
    purpose: v.purpose,
    catalogueItemIds: v.catalogueItemIds,
    itemsPresented: v.itemsPresented,
    expenseAmount: v.expenseAmount,
    expenseCurrency: v.expenseCurrency,
    expenseNote: v.expenseNote,
    outcome: v.outcome,
    expectedGrams: v.expectedGrams,
    actualGrams: v.actualGrams,
    discussion: v.discussion,
    orderId: v.orderId,
  };
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const url = new URL(req.url);
  const contactId = url.searchParams.get('contactId');
  const assignee = url.searchParams.get('assignee');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  // An agent sees their own visits; a manager their team's; an owner all.
  const ids = await visibleUserIds(user);

  const range: Record<string, Date> = {};
  if (from) { const d = new Date(from); if (!isNaN(d.getTime())) range.gte = d; }
  if (to) { const d = new Date(to); if (!isNaN(d.getTime())) { d.setHours(23, 59, 59, 999); range.lte = d; } }

  const visits = await prisma.crmFieldVisit.findMany({
    where: {
      tenantId: user.tenantId,
      ...(contactId ? { contactId } : {}),
      ...(assignee ? { assigneeUserId: assignee } : ids === 'all' ? {} : { assigneeUserId: { in: ids } }),
      ...(Object.keys(range).length ? { plannedAt: range } : {}),
    },
    orderBy: { plannedAt: 'desc' },
    take: 500,
  });

  const now = new Date();
  const contactIds = [...new Set(visits.map((v) => v.contactId))];
  const [contacts, members] = await Promise.all([
    prisma.crmContact.findMany({
      where: { tenantId: user.tenantId, id: { in: contactIds } },
      select: { id: true, name: true, company: true, city: true },
    }),
    prisma.user.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true } }),
  ]);
  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const memberById = new Map(members.map((m) => [m.id, m.name]));

  return NextResponse.json({
    visits: visits.map((v) => ({
      ...serialize(v, now),
      contactName: contactById.get(v.contactId)?.name ?? 'Unknown',
      company: contactById.get(v.contactId)?.company ?? null,
      city: contactById.get(v.contactId)?.city ?? null,
      assigneeName: v.assigneeUserId ? memberById.get(v.assigneeUserId) ?? 'Former member' : null,
    })),
    report: summariseVisits(visits as VisitRow[], now),
    canPlanForOthers: MANAGE_ROLES.includes(user.role),
  });
}

/** Plan a visit (FLD-01). */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const contactId = typeof b?.contactId === 'string' ? b.contactId : '';
  if (!contactId) return NextResponse.json({ error: 'Choose a customer.' }, { status: 400 });

  const contact = await prisma.crmContact.findFirst({
    where: { id: contactId, tenantId: user.tenantId },
    select: { id: true, name: true, zone: true, ownerId: true },
  });
  if (!contact) return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });

  const plannedAt = typeof b?.plannedAt === 'string' ? new Date(b.plannedAt) : null;
  if (!plannedAt || isNaN(plannedAt.getTime())) {
    return NextResponse.json({ error: 'Pick a date for the visit.' }, { status: 400 });
  }

  // An agent plans their own visits; only a lead plans somebody else's.
  let assigneeUserId = typeof b?.assigneeUserId === 'string' && b.assigneeUserId ? b.assigneeUserId : user.id;
  if (assigneeUserId !== user.id && !MANAGE_ROLES.includes(user.role)) {
    assigneeUserId = user.id;
  }

  const created = await prisma.crmFieldVisit.create({
    data: {
      tenantId: user.tenantId,
      contactId,
      assigneeUserId,
      zoneId: null,
      status: 'planned',
      plannedAt,
      purpose: (typeof b?.purpose === 'string' ? b.purpose.trim() : '') || null,
      expectedGrams: Number(b?.expectedGrams) > 0 ? Number(b?.expectedGrams) : null,
      createdByUserId: user.id,
    },
  });

  await audit({
    tenantId: user.tenantId, actorId: user.id, action: 'crm.visit.planned',
    targetType: 'contact', targetId: contactId,
    detail: plannedAt.toISOString().slice(0, 10),
  });

  return NextResponse.json({ visit: serialize(created, new Date()) }, { status: 201 });
}

/** Log what happened, or cancel (FLD-02..04). */
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = typeof b?.id === 'string' ? b.id : '';
  if (!id) return NextResponse.json({ error: 'A visit id is required.' }, { status: 400 });

  const existing = await prisma.crmFieldVisit.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!existing) return NextResponse.json({ error: 'Visit not found.' }, { status: 404 });
  if (existing.assigneeUserId !== user.id && !MANAGE_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'This visit is not yours to log.' }, { status: 403 });
  }

  const data: Record<string, unknown> = {};

  if (b?.status === 'cancelled') data.status = 'cancelled';

  if (b?.status === 'visited' || b?.outcome) {
    data.status = 'visited';
    const visitedAt = typeof b?.visitedAt === 'string' ? new Date(b.visitedAt) : new Date();
    data.visitedAt = isNaN(visitedAt.getTime()) ? new Date() : visitedAt;
  }

  if (typeof b?.outcome === 'string') {
    if (!VISIT_OUTCOME_VALUES.has(b.outcome as never)) {
      return NextResponse.json({ error: 'That outcome is not one we record.' }, { status: 400 });
    }
    data.outcome = b.outcome;
  }

  if (b && 'plannedAt' in b) {
    const d = new Date(String(b.plannedAt));
    if (isNaN(d.getTime())) return NextResponse.json({ error: 'That date is not valid.' }, { status: 400 });
    data.plannedAt = d;
    // Re-planning a missed visit makes it planned again rather than leaving it
    // counted as a failure for ever.
    if (existing.status === 'missed') data.status = 'planned';
  }

  if ('purpose' in (b ?? {})) data.purpose = (typeof b!.purpose === 'string' ? b!.purpose.trim() : '') || null;
  if ('discussion' in (b ?? {})) data.discussion = (typeof b!.discussion === 'string' ? b!.discussion.trim() : '') || null;
  if ('itemsPresented' in (b ?? {})) data.itemsPresented = (typeof b!.itemsPresented === 'string' ? b!.itemsPresented.trim() : '') || null;
  if (Array.isArray(b?.catalogueItemIds)) data.catalogueItemIds = b.catalogueItemIds.map(String).filter(Boolean).slice(0, 100);
  if ('expenseNote' in (b ?? {})) data.expenseNote = (typeof b!.expenseNote === 'string' ? b!.expenseNote.trim() : '') || null;

  for (const field of ['expenseAmount', 'expectedGrams', 'actualGrams'] as const) {
    if (field in (b ?? {})) {
      const raw = b![field];
      if (raw === null || raw === '') { data[field] = null; continue; }
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: `${field === 'expenseAmount' ? 'Spend' : 'Weight'} must be zero or more.` }, { status: 400 });
      }
      data[field] = n;
    }
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });

  const updated = await prisma.crmFieldVisit.update({ where: { id }, data });

  // A completed visit is real customer contact, so the contact's own activity
  // reflects it — otherwise a customer visited last week still looks untouched.
  if (data.status === 'visited') {
    await prisma.crmContact.update({
      where: { id: existing.contactId },
      data: {
        lastConnectAt: updated.visitedAt ?? new Date(),
        lastActivityAt: new Date(),
        officeVisitDone: true,
        ...(updated.discussion ? { lastFeedback: updated.discussion } : {}),
      },
    }).catch(() => undefined);

    await audit({
      tenantId: user.tenantId, actorId: user.id, action: 'crm.visit.logged',
      targetType: 'contact', targetId: existing.contactId,
      detail: `${updated.outcome ?? 'visited'}${updated.actualGrams ? ` · ${updated.actualGrams}g` : ''}`,
    });
  }

  return NextResponse.json({ visit: serialize(updated, new Date()) });
}
