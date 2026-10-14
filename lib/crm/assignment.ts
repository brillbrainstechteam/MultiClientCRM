import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';

/**
 * The link between the two assignments.
 *
 * A contact carries two named owner slots — `ownerId` (sales) and
 * `marketingOwnerId`. A conversation carries one `assigneeUserId`. They are
 * genuinely different things: the sales owner holds the relationship for as
 * long as it lasts, while the chat assignee answers one thread and can change
 * with a handoff or a shift. Before this, nothing connected them, so handing a
 * contact to a new sales person left their open chats sitting in the old
 * person's inbox.
 *
 * The rule, in both directions:
 *
 *  - Contact → conversations. Changing the sales owner moves that contact's
 *    conversations to the new owner, but only the ones that are **unassigned**
 *    or still assigned to the **previous** owner. A thread somebody else was
 *    deliberately put on is left exactly where it is — an automatic rule must
 *    never undo a human handoff.
 *  - Conversation → contact. Assigning a chat fills in the contact's sales
 *    owner only when that slot is **empty**. It never overwrites a real owner,
 *    because answering one message is not taking over the account.
 *
 * Phone matching is on digits only: a conversation stores `contactPhone` as
 * WhatsApp sends it (no '+'), while a contact's `mobile` is whatever the import
 * or the user typed.
 */

const digits = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '');

export interface ContactRef {
  id: string;
  mobile: string;
  /** The owner before this change, so we know which chats may follow. */
  ownerId: string | null;
}

/**
 * Move a reassigned contact's conversations to the new sales owner.
 * Returns how many conversations actually moved.
 */
export async function propagateContactOwner(input: {
  tenantId: string;
  contacts: ContactRef[];
  newOwnerId: string;
  actorId?: string | null;
}): Promise<number> {
  const { tenantId, contacts, newOwnerId } = input;

  // Group by previous owner: which chats may follow depends on who held them.
  const byPrevOwner = new Map<string, string[]>();
  for (const c of contacts) {
    const phone = digits(c.mobile);
    if (!phone) continue;
    const key = c.ownerId ?? '';
    const list = byPrevOwner.get(key) ?? [];
    list.push(phone);
    byPrevOwner.set(key, list);
  }

  let moved = 0;
  for (const [prevOwnerId, phones] of byPrevOwner) {
    if (phones.length === 0) continue;
    // contactPhone has no '+', so match on the digit string directly.
    //
    // The two followable cases are listed explicitly rather than filtered with
    // `assigneeUserId: { not: newOwnerId }`: in SQL that is NULL-unsafe —
    // `NULL <> 'x'` is NULL, not true — so an unassigned conversation, the very
    // case this exists for, would never match.
    if (prevOwnerId === newOwnerId) continue;
    const followable = prevOwnerId
      ? [{ assigneeUserId: null }, { assigneeUserId: prevOwnerId }]
      : [{ assigneeUserId: null }];
    const r = await prisma.conversation.updateMany({
      where: { tenantId, contactPhone: { in: phones }, OR: followable },
      data: { assigneeUserId: newOwnerId },
    });
    moved += r.count;
  }

  return moved;
}

/**
 * Fill a contact's empty sales-owner slot from a conversation assignment.
 * Returns the contact id that was adopted, or null when nothing changed.
 */
export async function adoptContactOwnerFromConversation(input: {
  tenantId: string;
  contactPhone: string;
  assigneeUserId: string | null;
  actorId?: string | null;
}): Promise<string | null> {
  const { tenantId, contactPhone, assigneeUserId } = input;
  if (!assigneeUserId) return null;
  const phone = digits(contactPhone);
  if (!phone) return null;

  // The stored mobile may or may not carry a '+' or spaces, so try both forms
  // rather than assuming one. (A full normalisation pass over the book is a
  // separate job; this keeps the common cases working.)
  const contact = await prisma.crmContact.findFirst({
    where: { tenantId, mobile: { in: [phone, `+${phone}`] } },
    select: { id: true, ownerId: true },
  });
  if (!contact) return null;
  // Never overwrite a real owner — answering a message is not taking the account.
  if (contact.ownerId) return null;

  await prisma.crmContact.update({
    where: { id: contact.id },
    data: { ownerId: assigneeUserId, lastActivityAt: new Date() },
  });
  await audit({
    tenantId,
    actorId: input.actorId ?? null,
    action: 'contact.ownerAdopted',
    targetType: 'contact',
    targetId: contact.id,
    detail: `Unowned contact took the chat assignee (${assigneeUserId}) as its sales owner`,
  });
  return contact.id;
}

/**
 * Contacts whose assignment is broken: no owner at all, or an owner who is not
 * an active user of this tenant (a removed or disabled member). These are
 * invisible to every agent and manager, so they quietly stop being worked.
 */
export async function findStrandedContacts(tenantId: string) {
  const activeIds = (
    await prisma.user.findMany({ where: { tenantId, status: 'active' }, select: { id: true } })
  ).map((u) => u.id);

  return prisma.crmContact.findMany({
    where: {
      tenantId,
      OR: [{ ownerId: '' }, { ownerId: { notIn: activeIds.length ? activeIds : ['-'] } }],
    },
    select: { id: true, name: true, mobile: true, ownerId: true, marketingOwnerId: true, city: true },
    orderBy: { lastActivityAt: 'desc' },
  });
}
