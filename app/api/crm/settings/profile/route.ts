import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';

/** The signed-in tenant's business profile. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const t = user.tenant;
  return NextResponse.json({
    businessName: t.businessName,
    businessPhone: t.businessPhone,
    businessModel: t.businessModel,
    gstNumber: t.gstNumber,
    cin: t.cin,
    entityType: t.entityType,
    plan: t.plan,
  });
}

/** Update the tenant's business profile (owner/admin only). */
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!['owner', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Only an owner or admin can edit the business profile.' }, { status: 403 });
  }

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : undefined);
  const data: Record<string, unknown> = {};
  const name = str(b.businessName); if (name) data.businessName = name;
  if (b.businessPhone !== undefined) data.businessPhone = str(b.businessPhone) || null;
  if (['b2b', 'b2c', 'both'].includes(String(b.businessModel))) data.businessModel = String(b.businessModel);
  if (b.gstNumber !== undefined) data.gstNumber = str(b.gstNumber) || null;
  if (b.cin !== undefined) data.cin = str(b.cin) || null;
  if (b.entityType !== undefined && str(b.entityType)) data.entityType = str(b.entityType);
  // Plan changes are owner-only.
  if (['trial', 'starter', 'growth', 'advanced'].includes(String(b.plan))) {
    if (user.role !== 'owner') return NextResponse.json({ error: 'Only the owner can change the plan.' }, { status: 403 });
    data.plan = String(b.plan);
  }

  await prisma.tenant.update({ where: { id: user.tenantId }, data });
  await audit({ tenantId: user.tenantId, actorId: user.id, action: 'profile.updated', targetType: 'tenant', targetId: user.tenantId });
  return NextResponse.json({ ok: true });
}
