import { prisma } from '@/lib/db';
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
