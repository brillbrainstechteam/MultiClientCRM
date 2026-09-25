import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { contactScopeWhere, visibleUserIds } from '@/lib/crm/scope';

/**
 * Datewise call plan / follow-up queue: contacts with a nextFollowUpAt, bucketed
 * into overdue / today / upcoming. Row-level scoped — an agent sees only their
 * own plan; a manager their department's; owner/admin everyone's. Each item
 * carries its assignee so the admin can group the plan per member. Also returns
 * a per-assignee breakdown (assignees[]) for the admin's overview.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const now = new Date();
  const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999);
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const horizon = new Date(startOfToday.getTime() + 30 * 24 * 60 * 60 * 1000);

  const scope = await contactScopeWhere(user);
  // Optional ?assignee=<userId> filter (admin drilling into one member's plan).
  const assignee = new URL(req.url).searchParams.get('assignee');
  const assigneeWhere = assignee ? { ownerId: assignee } : {};

  const [rows, members] = await Promise.all([
    prisma.crmContact.findMany({
      where: { tenantId: user.tenantId, nextFollowUpAt: { not: null, lt: horizon }, ...scope, ...assigneeWhere },
      orderBy: { nextFollowUpAt: 'asc' },
      take: 500,
      select: {
        id: true, name: true, company: true, mobile: true, nextFollowUpAt: true, leadStatus: true,
        interestedIn: true, ownerId: true, kamUserId: true, businessSegment: true, grade: true, preferredLanguage: true,
      },
    }),
    prisma.user.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true } }),
  ]);
  const nameById = new Map(members.map((m) => [m.id, m.name]));

  const map = (c: (typeof rows)[number]) => ({
    id: c.id, name: c.name, company: c.company, mobile: c.mobile,
    nextFollowUpAt: c.nextFollowUpAt ? c.nextFollowUpAt.toISOString() : null,
    leadStatus: c.leadStatus, interestedIn: c.interestedIn,
    ownerId: c.ownerId, ownerName: nameById.get(c.ownerId) ?? null,
    businessSegment: c.businessSegment, grade: c.grade, preferredLanguage: c.preferredLanguage,
  });

  const overdue = rows.filter((c) => c.nextFollowUpAt! < startOfToday).map(map);
  const today = rows.filter((c) => c.nextFollowUpAt! >= startOfToday && c.nextFollowUpAt! <= endOfToday).map(map);
  const upcoming = rows.filter((c) => c.nextFollowUpAt! > endOfToday).map(map);

  // Per-assignee breakdown (only meaningful for managers/admins who see >1 owner).
  const vis = await visibleUserIds(user);
  const byAssignee = new Map<string, { ownerId: string; ownerName: string | null; overdue: number; today: number; upcoming: number; total: number }>();
  for (const [bucket, list] of [['overdue', overdue], ['today', today], ['upcoming', upcoming]] as const) {
    for (const c of list) {
      const k = c.ownerId;
      const row = byAssignee.get(k) ?? { ownerId: k, ownerName: c.ownerName, overdue: 0, today: 0, upcoming: 0, total: 0 };
      row[bucket] += 1; row.total += 1;
      byAssignee.set(k, row);
    }
  }

  return NextResponse.json({
    scope: vis === 'all' ? 'all' : 'scoped',
    overdue, today, upcoming,
    counts: { overdue: overdue.length, today: today.length, upcoming: upcoming.length },
    assignees: [...byAssignee.values()].sort((a, b) => b.total - a.total),
  });
}
