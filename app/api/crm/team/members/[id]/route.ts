import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { audit } from '@/lib/crm/audit';

const ROLES = ['admin', 'manager', 'agent'];
const DEPTS = ['sales', 'marketing', 'support', 'other'];

/** Update a member: role, department, status (activate/disable), or reset password. Owner/admin only. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!['owner', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Only the account owner or an admin can manage members.' }, { status: 403 });
  }
  const { id } = await params;
  const target = await prisma.user.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!target) return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
  if (target.role === 'owner') return NextResponse.json({ error: 'The account owner cannot be modified here.' }, { status: 400 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const data: Record<string, unknown> = {};
  if (ROLES.includes(str(b.role))) data.role = str(b.role);
  if (DEPTS.includes(str(b.department))) data.teamFunction = str(b.department);
  if (b.status === 'active' || b.status === 'disabled') data.status = b.status;
  if (typeof b.password === 'string' && b.password.length >= 6) data.passwordHash = await hashPassword(b.password);
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });

  // Re-enabling: within included seats is free; beyond is allowed only if the
  // plan supports paid overage (else blocked, e.g. trial).
  if (data.status === 'active' && target.status !== 'active') {
    const sub = await prisma.subscription.findUnique({ where: { tenantId: user.tenantId } });
    const plan = sub ? await prisma.subscriptionPlan.findUnique({ where: { code: sub.planCode } }) : null;
    const lim = (plan?.limits as { users?: number; seatOveragePrice?: number } | null);
    const limit = lim?.users;
    const overagePrice = lim?.seatOveragePrice ?? 0;
    if (typeof limit === 'number' && overagePrice <= 0) {
      const active = await prisma.user.count({ where: { tenantId: user.tenantId, status: 'active' } });
      if (active >= limit) return NextResponse.json({ error: `All ${limit} plan seats are in use.`, code: 'seat_limit' }, { status: 402 });
    }
  }
  // Disabling a member kills their sessions.
  if (data.status === 'disabled') await prisma.session.deleteMany({ where: { userId: id } });

  await prisma.user.update({ where: { id }, data });
  await audit({ tenantId: user.tenantId, actorId: user.id, action: 'member.updated', targetType: 'user', targetId: id, detail: Object.keys(data).join(',') });
  return NextResponse.json({ ok: true });
}
