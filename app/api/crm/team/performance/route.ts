import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { visibleUserIds } from '@/lib/crm/scope';

/**
 * Per-member performance: assigned contacts, calls, and the first-call state
 * breakdown (follow-up / not-interested / enquiry-received) + conversion.
 * Row-level scoped: an agent sees only their own row; a manager their
 * department; owner/admin everyone. Optional ?from=YYYY-MM-DD&to=YYYY-MM-DD.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const tenantId = user.tenantId;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : null;
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : null;
  const at = (from || to) ? { ...(from && !isNaN(from.getTime()) ? { gte: from } : {}), ...(to && !isNaN(to.getTime()) ? { lte: to } : {}) } : undefined;

  const vis = await visibleUserIds(user);
  const userWhere = vis === 'all' ? { tenantId } : { tenantId, id: { in: vis } };
  const scopeIds = vis === 'all' ? undefined : vis;

  const [members, callsByState, contactsByOwner, enquiriesByOwner] = await Promise.all([
    prisma.user.findMany({ where: userWhere, select: { id: true, name: true, email: true, role: true, teamFunction: true, status: true }, orderBy: { createdAt: 'asc' } }),
    prisma.crmCallLog.groupBy({
      by: ['byUserId', 'disposition'],
      where: { tenantId, byUserId: scopeIds ? { in: scopeIds } : { not: null }, ...(at ? { createdAt: at } : {}) },
      _count: true,
    }),
    prisma.crmContact.groupBy({ by: ['ownerId'], where: { tenantId, ...(scopeIds ? { ownerId: { in: scopeIds } } : {}) }, _count: true }),
    // Enquiries attributed to the caller who generated them (disposition on the call).
    prisma.crmCallLog.groupBy({ by: ['byUserId'], where: { tenantId, disposition: 'enquiry_received', byUserId: scopeIds ? { in: scopeIds } : { not: null }, ...(at ? { createdAt: at } : {}) }, _count: true }),
  ]);

  // byUserId -> { disposition -> count }
  const stateByUser = new Map<string, Record<string, number>>();
  for (const r of callsByState) {
    if (!r.byUserId) continue;
    const m = stateByUser.get(r.byUserId) ?? {};
    m[r.disposition ?? 'other'] = (m[r.disposition ?? 'other'] ?? 0) + (r._count as number);
    stateByUser.set(r.byUserId, m);
  }
  const contactsByOwnerMap = new Map(contactsByOwner.map((r) => [r.ownerId, r._count as number]));
  const enqByUser = new Map(enquiriesByOwner.map((r) => [r.byUserId, r._count as number]));

  const rows = members.map((m) => {
    const s = stateByUser.get(m.id) ?? {};
    const followUp = s.follow_up ?? 0;
    const notInterested = s.not_interested ?? 0;
    const enquiries = s.enquiry_received ?? 0;
    const calls = Object.values(s).reduce((a, b) => a + b, 0);
    const conversion = calls > 0 ? Math.round((enquiries / calls) * 100) : 0;
    return {
      userId: m.id, name: m.name, email: m.email, role: m.role, department: m.teamFunction, status: m.status,
      assignedContacts: contactsByOwnerMap.get(m.id) ?? 0,
      calls, followUp, notInterested, enquiries: enquiries || (enqByUser.get(m.id) ?? 0), conversion,
    };
  });

  // Team totals.
  const totals = rows.reduce((t, r) => ({
    assignedContacts: t.assignedContacts + r.assignedContacts, calls: t.calls + r.calls,
    followUp: t.followUp + r.followUp, notInterested: t.notInterested + r.notInterested, enquiries: t.enquiries + r.enquiries,
  }), { assignedContacts: 0, calls: 0, followUp: 0, notInterested: 0, enquiries: 0 });

  return NextResponse.json({ scope: vis === 'all' ? 'all' : 'scoped', rows, totals });
}
