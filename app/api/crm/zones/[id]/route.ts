import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';

/** Update a zone's members (and optionally states/cities/name). Owner/admin only. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!['owner', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Only the account owner or an admin can edit zones.' }, { status: 403 });
  }
  const { id } = await params;
  const zone = await prisma.crmZone.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
  if (!zone) return NextResponse.json({ error: 'Zone not found.' }, { status: 404 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (Array.isArray(b.memberUserIds)) data.memberUserIds = b.memberUserIds.map(String).filter(Boolean);
  if (Array.isArray(b.states)) data.states = b.states.map(String).filter(Boolean);
  if (Array.isArray(b.cities)) data.cities = b.cities.map(String).filter(Boolean);
  if (typeof b.name === 'string' && b.name.trim()) data.name = b.name.trim();
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });

  await prisma.crmZone.update({ where: { id }, data });
  await audit({ tenantId: user.tenantId, actorId: user.id, action: 'zone.updated', targetType: 'zone', targetId: id, detail: Object.keys(data).join(',') });
  return NextResponse.json({ ok: true });
}
