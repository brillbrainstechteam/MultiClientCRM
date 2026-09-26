import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { visibleUserIds } from '@/lib/crm/scope';

/**
 * Per-member calling report. Per assignee (contact owner):
 *   - assignedContacts  : contacts assigned to them
 *   - calls             : calls logged
 *   - followUpInProgress: contacts with a future follow-up scheduled (+ the
 *                         earliest such date, "next follow-up")
 *   - notInterested     : contacts marked Not interested
 *   - enquiryReceived   : contacts that produced an enquiry (handed to sales)
 * Row-level scoped: agent = self, manager = department, owner/admin = all.
 * Optional ?from=YYYY-MM-DD&to=YYYY-MM-DD limits the call count window.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const tenantId = user.tenantId;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : null;
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : null;
  const at = (from || to) ? { ...(from && !isNaN(from.getTime()) ? { gte: from } : {}), ...(to && !isNaN(to.getTime()) ? { lte: to } : {}) } : undefined;
  const now = new Date();

  const vis = await visibleUserIds(user);
  const userWhere = vis === 'all' ? { tenantId } : { tenantId, id: { in: vis } };
  const ownerIn = vis === 'all' ? {} : { ownerId: { in: vis } };
  const byUserIn = vis === 'all' ? { not: null } : { in: vis };

  const [members, assignedByOwner, stateByOwner, followUpByOwner, callsByUser] = await Promise.all([
    prisma.user.findMany({ where: userWhere, select: { id: true, name: true, email: true, role: true, teamFunction: true, status: true }, orderBy: { createdAt: 'asc' } }),
    prisma.crmContact.groupBy({ by: ['ownerId'], where: { tenantId, ...ownerIn }, _count: true }),
    prisma.crmContact.groupBy({ by: ['ownerId', 'leadStatus'], where: { tenantId, ...ownerIn }, _count: true }),
    prisma.crmContact.groupBy({ by: ['ownerId'], where: { tenantId, ...ownerIn, nextFollowUpAt: { gt: now } }, _count: true, _min: { nextFollowUpAt: true } }),
    prisma.crmCallLog.groupBy({ by: ['byUserId'], where: { tenantId, byUserId: byUserIn, ...(at ? { createdAt: at } : {}) }, _count: true }),
  ]);

  const assigned = new Map(assignedByOwner.map((r) => [r.ownerId, r._count as number]));
  const calls = new Map(callsByUser.map((r) => [r.byUserId, r._count as number]));
  const followUp = new Map(followUpByOwner.map((r) => [r.ownerId, { count: r._count as number, next: r._min.nextFollowUpAt }]));
  // ownerId -> { leadStatus -> count }
  const states = new Map<string, Record<string, number>>();
  for (const r of stateByOwner) {
    const m = states.get(r.ownerId) ?? {};
    m[r.leadStatus] = (m[r.leadStatus] ?? 0) + (r._count as number);
    states.set(r.ownerId, m);
  }

  const rows = members.map((m) => {
    const s = states.get(m.id) ?? {};
    const fu = followUp.get(m.id);
    return {
      userId: m.id, name: m.name, email: m.email, role: m.role, department: m.teamFunction, status: m.status,
      assignedContacts: assigned.get(m.id) ?? 0,
      calls: calls.get(m.id) ?? 0,
      followUpInProgress: fu?.count ?? 0,
      nextFollowUpAt: fu?.next ? fu.next.toISOString() : null,
      notInterested: s.not_interested ?? 0,
      enquiryReceived: s.enquiry_generated ?? 0,
    };
  });

  const totals = rows.reduce((t, r) => ({
    assignedContacts: t.assignedContacts + r.assignedContacts, calls: t.calls + r.calls,
    followUpInProgress: t.followUpInProgress + r.followUpInProgress, notInterested: t.notInterested + r.notInterested, enquiryReceived: t.enquiryReceived + r.enquiryReceived,
  }), { assignedContacts: 0, calls: 0, followUpInProgress: 0, notInterested: 0, enquiryReceived: 0 });

  return NextResponse.json({ scope: vis === 'all' ? 'all' : 'scoped', rows, totals });
}
