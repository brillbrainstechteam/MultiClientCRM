import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';

/** Assign (or unassign) a conversation to an agent. Persisted + audited. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  // Agents can't reassign (per the roles matrix); owner/admin/manager can.
  if (!['owner', 'admin', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Your role cannot reassign conversations.' }, { status: 403 });
  }
  const { id } = await params;
  const convo = await prisma.conversation.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
  if (!convo) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });

  const b = (await req.json().catch(() => ({}))) as { assigneeUserId?: string | null };
  const assigneeUserId = typeof b.assigneeUserId === 'string' && b.assigneeUserId ? b.assigneeUserId : null;

  await prisma.conversation.update({ where: { id }, data: { assigneeUserId } });
  await audit({
    tenantId: user.tenantId, actorId: user.id, action: 'conversation.assigned',
    targetType: 'conversation', targetId: id, detail: assigneeUserId ? `-> ${assigneeUserId}` : 'unassigned',
  });
  return NextResponse.json({ ok: true });
}
