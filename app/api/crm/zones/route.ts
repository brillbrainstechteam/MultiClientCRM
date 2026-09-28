import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { ensureZones } from '@/lib/crm/zone-routing';
import { audit } from '@/lib/crm/audit';

/**
 * Zone routing config. GET returns the tenant's zones (seeded on first use) with
 * the members covering each, plus the roster to assign from. Owner/admin/manager.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!['owner', 'admin', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Not permitted.' }, { status: 403 });
  }
  const [zones, members] = await Promise.all([
    ensureZones(user.tenantId),
    prisma.user.findMany({ where: { tenantId: user.tenantId, status: 'active' }, select: { id: true, name: true, role: true, teamFunction: true }, orderBy: { createdAt: 'asc' } }),
  ]);
  return NextResponse.json({
    zones: zones
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((z) => ({ id: z.id, name: z.name, code: z.code, states: z.states, cities: z.cities, memberUserIds: z.memberUserIds })),
    members: members.map((m) => ({ id: m.id, name: m.name, role: m.role, department: m.teamFunction })),
  });
}

/** Create a new (empty) zone. Owner/admin only. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!['owner', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Only the account owner or an admin can add zones.' }, { status: 403 });
  }
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = (typeof b.name === 'string' ? b.name : '').trim();
  if (!name) return NextResponse.json({ error: 'Zone name is required.' }, { status: 400 });

  // Names are unique per tenant (case-insensitive) so routing stays unambiguous.
  await ensureZones(user.tenantId);
  const existing = await prisma.crmZone.findMany({ where: { tenantId: user.tenantId }, select: { name: true } });
  if (existing.some((z) => z.name.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: 'A zone with this name already exists.' }, { status: 400 });
  }
  const code = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'custom';
  const created = await prisma.crmZone.create({ data: { tenantId: user.tenantId, name, code, states: [], cities: [], memberUserIds: [] } });
  await audit({ tenantId: user.tenantId, actorId: user.id, action: 'zone.created', targetType: 'zone', targetId: created.id, detail: name });
  return NextResponse.json({ id: created.id, name: created.name, code: created.code, states: created.states, cities: created.cities, memberUserIds: created.memberUserIds }, { status: 201 });
}
