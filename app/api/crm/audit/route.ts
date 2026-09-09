import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

/** Workspace audit trail (Team & Access -> Audit). Owner/admin/manager only. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!['owner', 'admin', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Not permitted.' }, { status: 403 });
  }

  const events = await prisma.crmAuditLog.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { at: 'desc' },
    take: 300,
  });
  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id, actorId: e.actorId, action: e.action,
      targetType: e.targetType, targetId: e.targetId, detail: e.detail,
      at: e.at.toISOString(),
    })),
  });
}
