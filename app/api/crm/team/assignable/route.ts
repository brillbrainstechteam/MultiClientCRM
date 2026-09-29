import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { ensureZones, matchZone } from '@/lib/crm/zone-routing';

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

/**
 * Members eligible to be assigned a conversation.
 *
 * If the contact's location maps to an area (zone), only that area's members are
 * returned (source: "zone"). Otherwise — no contact, or a location that matches
 * no area — the whole active team is returned (source: "all"). `allMembers` is
 * always included so the UI can offer "show everyone" even inside an area.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const tenantId = user.tenantId;
  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get('contactId');

  const roster = await prisma.user.findMany({
    where: { tenantId, status: 'active' },
    select: { id: true, name: true, email: true, role: true, teamFunction: true },
    orderBy: { createdAt: 'asc' },
  });
  const ser = (u: typeof roster[number]) => ({ id: u.id, name: u.name, email: u.email, role: u.role, department: u.teamFunction });
  const allMembers = roster.map(ser);

  let zoneName: string | null = null;
  let memberIds: string[] | null = null;

  if (contactId) {
    const contact = await prisma.crmContact.findFirst({ where: { id: contactId, tenantId }, select: { city: true, state: true, zone: true } });
    if (contact) {
      const zones = await ensureZones(tenantId);
      // Prefer an explicit stored zone name, else map City -> State -> zone.
      const byName = contact.zone ? zones.find((z) => norm(z.name) === norm(contact.zone)) : null;
      const zone = byName ?? matchZone(zones, contact.city, contact.state);
      if (zone && (zone.memberUserIds?.length ?? 0) > 0) {
        zoneName = zone.name;
        memberIds = zone.memberUserIds;
      }
    }
  }

  const idSet = memberIds ? new Set(memberIds) : null;
  const members = idSet ? allMembers.filter((m) => idSet.has(m.id)) : allMembers;
  // If the area's members are all inactive/removed, fall back to everyone.
  const source = idSet && members.length > 0 ? 'zone' : 'all';

  return NextResponse.json({
    source,
    zoneName: source === 'zone' ? zoneName : null,
    members: source === 'zone' ? members : allMembers,
    allMembers,
  });
}
