import { prisma } from '@/lib/db';
import type { User } from '@prisma/client';

/**
 * Row-level visibility (strict per-role):
 *   owner / admin  -> everything in the tenant ('all')
 *   manager        -> their department's members (by teamFunction) + self
 *   agent          -> only their own assigned rows
 *
 * Assignment is by `ownerId` on contacts and `assigneeUserId` on conversations
 * / call tasks. Returns the set of user ids whose assigned data is visible, or
 * 'all' for no restriction.
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

/** where-fragment for CrmContact visibility (assignment = ownerId). */
export async function contactScopeWhere(user: Pick<User, 'id' | 'tenantId' | 'role' | 'teamFunction'>): Promise<Record<string, unknown>> {
  const ids = await visibleUserIds(user);
  return ids === 'all' ? {} : { ownerId: { in: ids } };
}

/** where-fragment for Conversation visibility (assignment = assigneeUserId). */
export async function conversationScopeWhere(user: Pick<User, 'id' | 'tenantId' | 'role' | 'teamFunction'>): Promise<Record<string, unknown>> {
  const ids = await visibleUserIds(user);
  return ids === 'all' ? {} : { assigneeUserId: { in: ids } };
}
