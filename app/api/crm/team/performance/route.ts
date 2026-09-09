import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

/** Per-agent performance from real data: assigned conversations, calls, actions. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!['owner', 'admin', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Not permitted.' }, { status: 403 });
  }
  const tenantId = user.tenantId;

  const [members, convByAssignee, callsByUser, auditByActor] = await Promise.all([
    prisma.user.findMany({ where: { tenantId }, select: { id: true, name: true, email: true, role: true, teamFunction: true } }),
    prisma.conversation.groupBy({ by: ['assigneeUserId'], where: { tenantId, assigneeUserId: { not: null } }, _count: true }),
    prisma.crmCallLog.groupBy({ by: ['byUserId'], where: { tenantId, byUserId: { not: null } }, _count: true }),
    prisma.crmAuditLog.groupBy({ by: ['actorId'], where: { tenantId, actorId: { not: null } }, _count: true }),
  ]);

  const conv = new Map(convByAssignee.map((r) => [r.assigneeUserId, r._count]));
  const calls = new Map(callsByUser.map((r) => [r.byUserId, r._count]));
  const acts = new Map(auditByActor.map((r) => [r.actorId, r._count]));

  return NextResponse.json({
    rows: members.map((m) => ({
      userId: m.id, name: m.name, email: m.email, role: m.role, teamFunction: m.teamFunction,
      assignedConversations: (conv.get(m.id) as number) ?? 0,
      calls: (calls.get(m.id) as number) ?? 0,
      actions: (acts.get(m.id) as number) ?? 0,
    })),
  });
}
