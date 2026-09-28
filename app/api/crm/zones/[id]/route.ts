import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Update a zone's members, name, or geography. Owner/admin only.
 *
 * A state or city belongs to EXACTLY ONE zone: when this zone claims states or
 * cities, the same values (case-insensitively) are removed from every other zone
 * in the tenant, so routing is never ambiguous.
 */
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
  const cleanList = (v: unknown) => {
    const seen = new Set<string>();
    return (Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean) : []).filter((s) => {
      const k = norm(s);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  const data: Record<string, unknown> = {};
  if (Array.isArray(b.memberUserIds)) data.memberUserIds = b.memberUserIds.map(String).filter(Boolean);
  if (Array.isArray(b.states)) data.states = cleanList(b.states);
  if (Array.isArray(b.cities)) data.cities = cleanList(b.cities);
  if (typeof b.name === 'string' && b.name.trim()) data.name = b.name.trim();
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });

  // Reject a rename that collides with another zone's name.
  if (typeof data.name === 'string') {
    const others = await prisma.crmZone.findMany({ where: { tenantId: user.tenantId, id: { not: id } }, select: { name: true } });
    if (others.some((z) => norm(z.name) === norm(data.name as string))) {
      return NextResponse.json({ error: 'A zone with this name already exists.' }, { status: 400 });
    }
  }

  const claimStates = (data.states as string[] | undefined) ?? null;
  const claimCities = (data.cities as string[] | undefined) ?? null;

  await prisma.$transaction(async (tx) => {
    // Move claimed states/cities out of every other zone (one zone per location).
    if ((claimStates && claimStates.length) || (claimCities && claimCities.length)) {
      const others = await tx.crmZone.findMany({ where: { tenantId: user.tenantId, id: { not: id } }, select: { id: true, states: true, cities: true } });
      const stateKeys = new Set((claimStates ?? []).map(norm));
      const cityKeys = new Set((claimCities ?? []).map(norm));
      for (const o of others) {
        const nextStates = claimStates ? o.states.filter((s) => !stateKeys.has(norm(s))) : o.states;
        const nextCities = claimCities ? o.cities.filter((c) => !cityKeys.has(norm(c))) : o.cities;
        if (nextStates.length !== o.states.length || nextCities.length !== o.cities.length) {
          await tx.crmZone.update({ where: { id: o.id }, data: { states: nextStates, cities: nextCities } });
        }
      }
    }
    await tx.crmZone.update({ where: { id }, data });
  });

  await audit({ tenantId: user.tenantId, actorId: user.id, action: 'zone.updated', targetType: 'zone', targetId: id, detail: Object.keys(data).join(',') });
  return NextResponse.json({ ok: true });
}

/** Delete a zone. Contacts already routed keep their stored zone/owner. Owner/admin only. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!['owner', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Only the account owner or an admin can delete zones.' }, { status: 403 });
  }
  const { id } = await params;
  const zone = await prisma.crmZone.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true, name: true } });
  if (!zone) return NextResponse.json({ error: 'Zone not found.' }, { status: 404 });

  await prisma.crmZone.delete({ where: { id } });
  await audit({ tenantId: user.tenantId, actorId: user.id, action: 'zone.deleted', targetType: 'zone', targetId: id, detail: zone.name });
  return NextResponse.json({ ok: true });
}
