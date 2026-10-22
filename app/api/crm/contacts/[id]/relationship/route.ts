import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';
import { sortTeam, describeRole } from '@/lib/crm/coverage';

/**
 * Relationship Team for a customer (PRD §8, GRP-02, GRP-04).
 *
 * Internal continuity: a primary salesperson, backups and a manager. This is
 * explicitly NOT WhatsApp group membership — a backup serves the customer
 * through the CRM whether or not they are a participant in any group, which is
 * what makes GRP-04 implementable at all given Meta's invite-only groups.
 *
 * Membership is standing access, unlike absence coverage: a backup can step in
 * at any time, not only while the primary is away.
 */

const ROLES = new Set(['primary', 'backup', 'manager']);
const MANAGE_ROLES = ['owner', 'admin', 'manager'];

interface Member { userId: string; role: string; position?: number }

async function loadTeam(tenantId: string, contactId: string) {
  const [members, users] = await Promise.all([
    prisma.crmRelationshipMember.findMany({ where: { tenantId, contactId } }),
    prisma.user.findMany({ where: { tenantId }, select: { id: true, name: true, email: true, teamFunction: true } }),
  ]);
  const byId = new Map(users.map((u) => [u.id, u]));
  return sortTeam(members).map((m) => ({
    userId: m.userId,
    name: byId.get(m.userId)?.name ?? 'Former member',
    teamFunction: byId.get(m.userId)?.teamFunction ?? null,
    role: m.role,
    position: m.position,
    label: describeRole(m.role, m.position),
  }));
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await ctx.params;

  const contact = await prisma.crmContact.findFirst({
    where: { id, tenantId: user.tenantId },
    select: { id: true, name: true, ownerId: true },
  });
  if (!contact) return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });

  return NextResponse.json({ team: await loadTeam(user.tenantId, id) });
}

/**
 * Replace the team.
 *
 * A whole-set write rather than add/remove calls: the UI edits the team as one
 * thing, and a partial update is how you end up with two primaries.
 */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!MANAGE_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Only an owner, admin or manager can change a relationship team.' }, { status: 403 });
  }
  const { id } = await ctx.params;

  const contact = await prisma.crmContact.findFirst({
    where: { id, tenantId: user.tenantId },
    select: { id: true, name: true },
  });
  if (!contact) return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });

  const b = (await req.json().catch(() => null)) as { members?: Member[] } | null;
  if (!b || !Array.isArray(b.members)) {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const clean: Member[] = [];
  const seen = new Set<string>();
  for (const m of b.members) {
    const userId = typeof m?.userId === 'string' ? m.userId : '';
    const role = ROLES.has(String(m?.role)) ? String(m.role) : 'backup';
    if (!userId || seen.has(userId)) continue; // one person, one role
    seen.add(userId);
    clean.push({ userId, role, position: Number(m?.position) || 0 });
  }

  if (clean.filter((m) => m.role === 'primary').length > 1) {
    return NextResponse.json({ error: 'A customer can have only one primary salesperson.' }, { status: 400 });
  }

  // Everyone named has to actually work here, or the team silently points at
  // ids that resolve to nothing on every later read.
  const valid = await prisma.user.findMany({
    where: { tenantId: user.tenantId, id: { in: clean.map((m) => m.userId) } },
    select: { id: true },
  });
  const validIds = new Set(valid.map((u) => u.id));
  const unknown = clean.filter((m) => !validIds.has(m.userId));
  if (unknown.length) {
    return NextResponse.json({ error: 'One of the people selected is not on this workspace.' }, { status: 400 });
  }

  // Backups are numbered for display, so an unnumbered set still reads as
  // "Backup 1, Backup 2" rather than two identical rows.
  let backupNo = 0;
  const rows = clean.map((m) => ({
    tenantId: user.tenantId,
    contactId: id,
    userId: m.userId,
    role: m.role,
    position: m.role === 'backup' ? (m.position || ++backupNo) : 0,
    addedByUserId: user.id,
  }));

  await prisma.$transaction([
    prisma.crmRelationshipMember.deleteMany({ where: { tenantId: user.tenantId, contactId: id } }),
    ...(rows.length ? [prisma.crmRelationshipMember.createMany({ data: rows })] : []),
  ]);

  await audit({
    tenantId: user.tenantId, actorId: user.id, action: 'crm.relationship_team.updated',
    targetType: 'contact', targetId: id,
    detail: rows.map((r) => `${r.role}:${r.userId}`).join(', ') || 'cleared',
  });

  return NextResponse.json({ team: await loadTeam(user.tenantId, id) });
}
