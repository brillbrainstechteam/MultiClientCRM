import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { ensureZones } from '@/lib/crm/zone-routing';

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
