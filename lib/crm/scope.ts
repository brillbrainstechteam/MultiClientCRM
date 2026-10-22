import { prisma } from '@/lib/db';
import { coveringFor } from '@/lib/crm/coverage';
import type { User } from '@prisma/client';

/**
 * Row-level visibility (strict per-role):
 *   owner / admin  -> everything in the tenant ('all')
 *   manager        -> their department's members (by teamFunction) + self
 *   agent          -> only their own assigned rows
 *
 * A contact carries two named owner slots — `ownerId` (sales) and
 * `marketingOwnerId` — and **either** being yours grants visibility, so a
 * contact worked jointly by sales and marketing shows up for both. Conversations
 * and call tasks keep a single `assigneeUserId`.
 *
 * Returns the set of user ids whose assigned data is visible, or 'all'.
 */
export async function visibleUserIds(user: Pick<User, 'id' | 'tenantId' | 'role' | 'teamFunction'>): Promise<string[] | 'all'> {
  if (user.role === 'owner' || user.role === 'admin') return 'all';
  if (user.role === 'manager') {
    const members = await prisma.user.findMany({
      where: { tenantId: user.tenantId, ...(user.teamFunction ? { teamFunction: user.teamFunction } : {}) },
      select: { id: true },
    });
    const ids = new Set(members.map((m) => m.id));
    ids.add(user.id);
    return [...ids];
  }
  return [user.id];
}

/**
 * Contacts assigned to any of `ids`, in either owner slot.
 *
 * Returned as a bare `{ OR: [...] }` clause meant to go **inside an `AND`
 * array**, never spread into a where object — a caller that spreads it beside
 * its own `OR` (a text search, say) would silently overwrite one of the two and
 * either leak rows or hide them. `contactScopeWhere` below is the spread-safe
 * wrapper for simple call sites.
 */
export function contactAssignedToClause(ids: string[]): Record<string, unknown> {
  return { OR: [{ ownerId: { in: ids } }, { marketingOwnerId: { in: ids } }] };
}

/** The same clause for exactly one person (an `?assignee=` drill-down). */
export function contactAssignedToUserClause(userId: string): Record<string, unknown> {
  return { OR: [{ ownerId: userId }, { marketingOwnerId: userId }] };
}

/**
 * Spread-safe where-fragment for CrmContact visibility.
 *
 * Wrapped in `AND` so `{ tenantId, ...scope, ...otherFilters }` stays correct
 * even when another fragment brings its own `OR`. Call sites that already use
 * `AND` themselves must compose with `contactScopeClause` instead.
 */
export async function contactScopeWhere(user: Pick<User, 'id' | 'tenantId' | 'role' | 'teamFunction'>): Promise<Record<string, unknown>> {
  const clause = await contactScopeClause(user);
  return clause ? { AND: [clause] } : {};
}

/** The visibility clause on its own, or null when the user may see everything. */
export async function contactScopeClause(
  user: Pick<User, 'id' | 'tenantId' | 'role' | 'teamFunction'>,
): Promise<Record<string, unknown> | null> {
  const ids = await visibleUserIds(user);
  return ids === 'all' ? null : contactAssignedToClause(ids);
}

/** True when this user may see/act on a contact, given both owner slots. */
export function canSeeContact(
  ids: string[] | 'all',
  contact: { ownerId: string | null; marketingOwnerId: string | null },
): boolean {
  if (ids === 'all') return true;
  return (
    (!!contact.ownerId && ids.includes(contact.ownerId))
    || (!!contact.marketingOwnerId && ids.includes(contact.marketingOwnerId))
  );
}

/** where-fragment for Conversation visibility (assignment = assigneeUserId). */
export async function conversationScopeWhere(user: Pick<User, 'id' | 'tenantId' | 'role' | 'teamFunction'>): Promise<Record<string, unknown>> {
  const ids = await visibleUserIds(user);
  return ids === 'all' ? {} : { assigneeUserId: { in: ids } };
}


// ---- Absence coverage and Relationship Team (PRD §8, §23, ZON-06) ---------

/**
 * Absent colleagues whose work this user may currently pick up.
 *
 * Computed, never stored: the moment the colleague is back the answer changes
 * on its own, with no cleanup job to forget to run. An agent who covers nobody
 * gets an empty list and their scope is exactly what it was.
 */
export async function coveredOwnerIds(
  user: Pick<User, 'id' | 'tenantId' | 'role'>,
): Promise<string[]> {
  const now = new Date();
  const absences = await prisma.crmAbsence.findMany({
    where: {
      tenantId: user.tenantId,
      startsAt: { lte: now },
      endedAt: null,
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      // Not this user's own absence — being away does not grant access.
      NOT: { userId: user.id },
    },
    select: { id: true, userId: true, kind: true, startsAt: true, endsAt: true, endedAt: true, coveredByUserIds: true },
  });
  if (absences.length === 0) return [];

  // Zones are the fallback when an absence named nobody, so they are only read
  // when there is actually an absence to resolve.
  const zones = await prisma.crmZone.findMany({
    where: { tenantId: user.tenantId },
    select: { id: true, memberUserIds: true },
  });
  const zonesByUser = new Map<string, string[]>();
  for (const z of zones) {
    for (const uid of z.memberUserIds) {
      zonesByUser.set(uid, [...(zonesByUser.get(uid) ?? []), z.id]);
    }
  }

  return coveringFor(
    {
      absences,
      zonesByUser,
      supervisorIds: new Set(user.role === 'manager' ? [user.id] : []),
    },
    user.id,
    now,
  );
}

/** Contacts this user is on the Relationship Team for. */
export async function relationshipContactIds(
  user: Pick<User, 'id' | 'tenantId'>,
): Promise<string[]> {
  const rows = await prisma.crmRelationshipMember.findMany({
    where: { tenantId: user.tenantId, userId: user.id },
    select: { contactId: true },
  });
  return rows.map((r) => r.contactId);
}

/**
 * Contact visibility including standing Relationship Team access and any
 * absence this user is currently covering.
 *
 * Kept separate from `contactScopeClause` so the plain ownership rule stays
 * available where that is genuinely what a query means (a "my customers"
 * count, say) — widening every such query would quietly inflate an agent's own
 * numbers with customers they are merely covering.
 */
export async function contactScopeClauseWithCover(
  user: Pick<User, 'id' | 'tenantId' | 'role' | 'teamFunction'>,
): Promise<Record<string, unknown> | null> {
  const ids = await visibleUserIds(user);
  if (ids === 'all') return null;

  const [covered, teamContactIds] = await Promise.all([
    coveredOwnerIds(user),
    relationshipContactIds(user),
  ]);

  const owners = [...new Set([...ids, ...covered])];
  const or: Record<string, unknown>[] = [
    { ownerId: { in: owners } },
    { marketingOwnerId: { in: owners } },
  ];
  if (teamContactIds.length) or.push({ id: { in: teamContactIds } });

  // One OR, meant for an AND array — same contract as contactAssignedToClause.
  return { OR: or };
}
