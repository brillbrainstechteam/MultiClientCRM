import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';
import { availabilityOf, isActive, type AbsenceRow } from '@/lib/crm/coverage';

/**
 * Absence and coverage (PRD §23, ZON-06, TEAM-06).
 *
 * Availability used to be the literal string 'available' in the bootstrap
 * response, so every member always looked present and no pending work was ever
 * offered to a backup.
 *
 * The rule enforced here: recording an absence never reassigns anything. It
 * widens, for a bounded period, who may act — and ownership is untouched, so
 * the returning agent's book is exactly as they left it.
 */

const KINDS = new Set(['absent', 'leave', 'temporarily_unavailable']);
const MANAGE_ROLES = ['owner', 'admin', 'manager'];

function serialize(a: {
  id: string; userId: string; kind: string; reason: string | null;
  startsAt: Date; endsAt: Date | null; endedAt: Date | null;
  coveredByUserIds: string[];
}) {
  return {
    id: a.id,
    userId: a.userId,
    kind: a.kind,
    reason: a.reason,
    startsAt: a.startsAt.toISOString(),
    endsAt: a.endsAt?.toISOString() ?? null,
    endedAt: a.endedAt?.toISOString() ?? null,
    coveredByUserIds: a.coveredByUserIds,
    active: isActive(a as AbsenceRow),
  };
}

/** Absences, plus each member's availability right now. */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const url = new URL(req.url);
  const onlyActive = url.searchParams.get('active') === 'true';

  const absences = await prisma.crmAbsence.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { startsAt: 'desc' },
    take: 200,
  });

  const members = await prisma.user.findMany({
    where: { tenantId: user.tenantId },
    select: { id: true, name: true, teamFunction: true },
  });

  const now = new Date();
  const rows = absences.map(serialize);

  return NextResponse.json({
    absences: onlyActive ? rows.filter((a) => a.active) : rows,
    availability: members.map((m) => ({
      userId: m.id,
      name: m.name,
      teamFunction: m.teamFunction,
      status: availabilityOf(absences as AbsenceRow[], m.id, now),
    })),
  });
}

/** Record an absence. A member may record their own; a manager anyone's. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const b = (await req.json().catch(() => null)) as {
    userId?: string; kind?: string; reason?: string;
    startsAt?: string; endsAt?: string | null; coveredByUserIds?: string[];
  } | null;
  if (!b) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });

  const targetUserId = b.userId || user.id;
  if (targetUserId !== user.id && !MANAGE_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'You can only record your own absence.' }, { status: 403 });
  }

  const member = await prisma.user.findFirst({
    where: { id: targetUserId, tenantId: user.tenantId },
    select: { id: true, name: true },
  });
  if (!member) return NextResponse.json({ error: 'That person is not on this workspace.' }, { status: 404 });

  const kind = KINDS.has(String(b.kind)) ? String(b.kind) : 'leave';
  const startsAt = b.startsAt ? new Date(b.startsAt) : new Date();
  if (isNaN(startsAt.getTime())) return NextResponse.json({ error: 'A valid start date is required.' }, { status: 400 });

  const endsAt = b.endsAt ? new Date(b.endsAt) : null;
  if (endsAt && isNaN(endsAt.getTime())) return NextResponse.json({ error: 'That end date is not valid.' }, { status: 400 });
  // An absence that ends before it starts would never be active, so the agent
  // would be marked away and nobody would ever be able to cover.
  if (endsAt && endsAt <= startsAt) {
    return NextResponse.json({ error: 'The return date must be after the start date.' }, { status: 400 });
  }

  const covered = Array.isArray(b.coveredByUserIds)
    ? [...new Set(b.coveredByUserIds.map(String).filter((id) => id && id !== targetUserId))].slice(0, 20)
    : [];

  const created = await prisma.crmAbsence.create({
    data: {
      tenantId: user.tenantId, userId: targetUserId, kind,
      reason: (b.reason ?? '').trim() || null,
      startsAt, endsAt, coveredByUserIds: covered,
      createdByUserId: user.id,
    },
  });

  await audit({
    tenantId: user.tenantId, actorId: user.id, action: 'crm.absence.recorded',
    targetType: 'user', targetId: targetUserId,
    detail: `${kind} from ${startsAt.toISOString().slice(0, 10)}${endsAt ? ` to ${endsAt.toISOString().slice(0, 10)}` : ' (open-ended)'}`,
  });

  return NextResponse.json({ absence: serialize(created) }, { status: 201 });
}

/** End an absence, or change its dates/cover. */
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const b = (await req.json().catch(() => null)) as {
    id?: string; end?: boolean; endsAt?: string | null; coveredByUserIds?: string[];
  } | null;
  if (!b?.id) return NextResponse.json({ error: 'An absence id is required.' }, { status: 400 });

  const existing = await prisma.crmAbsence.findFirst({
    where: { id: b.id, tenantId: user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  if (existing.userId !== user.id && !MANAGE_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'You can only change your own absence.' }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  // Coming back early has to take effect now, not on the planned end date —
  // otherwise the returning agent's work stays open to their colleagues.
  if (b.end === true) data.endedAt = new Date();
  if ('endsAt' in b) {
    const e = b.endsAt ? new Date(b.endsAt) : null;
    if (e && isNaN(e.getTime())) return NextResponse.json({ error: 'That end date is not valid.' }, { status: 400 });
    if (e && e <= existing.startsAt) {
      return NextResponse.json({ error: 'The return date must be after the start date.' }, { status: 400 });
    }
    data.endsAt = e;
  }
  if (Array.isArray(b.coveredByUserIds)) {
    data.coveredByUserIds = [...new Set(b.coveredByUserIds.map(String).filter((id) => id && id !== existing.userId))].slice(0, 20);
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const updated = await prisma.crmAbsence.update({ where: { id: b.id }, data });
  await audit({
    tenantId: user.tenantId, actorId: user.id,
    action: b.end === true ? 'crm.absence.ended' : 'crm.absence.updated',
    targetType: 'user', targetId: existing.userId,
  });

  return NextResponse.json({ absence: serialize(updated) });
}
