/**
 * Inbox selectors — filter, sort, and scope conversations for the workspace.
 * These are pure functions over mock data; no React or DOM dependencies.
 */

import type { RoleKey } from '@crm/mock-data';
import { users } from '@crm/mock-data';
import type { InboxConversation, QuickViewKey, InboxFilterState, ConversationSortKey } from './inbox-types';
import { allConversations } from './inbox-mock-data';

// ---- Quick-view filtering -------------------------------------------------

export function applyQuickView(
  conversations: InboxConversation[],
  view: QuickViewKey,
  userId: string,
): InboxConversation[] {
  // Backfilled WhatsApp history is context, not work. It must stay out of every
  // working queue: an imported thread has no assignee and ends on a customer
  // message, so without this it would land in BOTH Unassigned and Needs Reply —
  // six months of old chats arriving as hundreds of apparently urgent tasks on
  // the customer's first morning, which is the exact outcome the import is
  // designed to avoid. A live reply promotes the thread and it rejoins normally.
  const live = (c: InboxConversation) =>
    !c.isSpam && !c.isBlocked && c.status !== 'imported';

  switch (view) {
    case 'all':
      return conversations.filter(live);
    case 'mine':
      return conversations.filter((c) => live(c) && c.assigneeId === userId);
    case 'unassigned':
      return conversations.filter((c) => live(c) && c.assigneeId === null && !c.botOwned);
    case 'needs-reply':
      return conversations.filter((c) => live(c) && c.replyStatus === 'awaiting-agent');
    case 'pending':
      return conversations.filter((c) => live(c) && c.status === 'pending');
    case 'overdue':
      return conversations.filter(
        (c) => live(c) && (c.sla.status === 'breached' || c.responseWindow.status === 'expired'),
      );
    case 'sla-breached':
      return conversations.filter((c) => live(c) && c.sla.status === 'breached');
    case 'resolved':
      return conversations.filter((c) => live(c) && c.status === 'resolved');
    case 'spam':
      return conversations.filter((c) => c.isSpam);
    case 'imported':
      // Deliberately reachable: the context is the point of importing it.
      return conversations.filter((c) => !c.isSpam && c.status === 'imported');

    // ---- Views that answer a question about the customer, not the thread ----
    case 'unread':
      return conversations.filter((c) => live(c) && c.unreadCount > 0);
    case 'new-leads':
      // A lead nobody has worked yet: still 'new' or merely assigned, and not
      // yet converted. An engaged lead is not a new one.
      return conversations.filter(
        (c) => live(c)
          && c.lifecycleStage !== 'customer'
          && ['new', 'assigned'].includes(c.leadStatus ?? ''),
      );
    case 'campaign-replies':
      return conversations.filter((c) => live(c) && c.isCampaignReply);
    case 'ad-leads':
      return conversations.filter((c) => live(c) && c.isAdLead);
    case 'missed-calls':
      return conversations.filter((c) => live(c) && c.hasMissedCall);
    case 'favourites':
      // Starred threads stay reachable even when blocked or resolved — that is
      // what starring them was for.
      return conversations.filter((c) => c.isFavourite);
    case 'blocked':
      return conversations.filter((c) => c.isBlocked);
    case 'window-closed':
      // Meta's 24-hour rule: only an approved template will deliver here.
      return conversations.filter(
        (c) => live(c) && c.responseWindow.status === 'expired',
      );
    default:
      return conversations.filter(live);
  }
}

// ---- Scope — which conversations an acting user may see ------------------

export function scopeConversations(
  conversations: InboxConversation[],
  role: RoleKey,
  userId: string,
  whatsappNumberId: string,
  branchId: string,
): InboxConversation[] {
  let result = conversations;

  // Number scope
  if (whatsappNumberId !== 'all') {
    result = result.filter((c) => c.whatsappNumberId === whatsappNumberId);
  }

  // Branch scope: derive by matching whatsapp numbers (numbers carry branchId)
  if (branchId !== 'all') {
    // We don't want to import whatsappNumbers here to keep the selector pure —
    // callers pass a pre-resolved set of allowed number IDs instead.
    // For the prototype, numbers are globally accessible so this is fine.
  }

  // Agent visibility: only assigned + unassigned conversations from their team
  if (role === 'agent') {
    const user = users.find((u) => u.id === userId);
    const teamId = user?.teamId ?? null;
    result = result.filter(
      (c) =>
        c.assigneeId === userId ||
        c.assigneeId === null ||
        (teamId !== null && c.teamId === teamId),
    );
  }

  return result;
}

// ---- Advanced filter application -----------------------------------------

export function applyFilters(
  conversations: InboxConversation[],
  filters: InboxFilterState,
): InboxConversation[] {
  return conversations.filter((c) => {
    if (filters.assigneeIds.length > 0) {
      const match =
        (c.assigneeId !== null && filters.assigneeIds.includes(c.assigneeId)) ||
        (filters.assigneeIds.includes('__unassigned__') && c.assigneeId === null);
      if (!match) return false;
    }
    if (filters.teamIds.length > 0 && (c.teamId === null || !filters.teamIds.includes(c.teamId))) {
      return false;
    }
    if (filters.labelIds.length > 0 && !filters.labelIds.some((l) => c.labelIds.includes(l))) {
      return false;
    }
    if (filters.statuses.length > 0 && !filters.statuses.includes(c.status)) {
      return false;
    }

    // ---- Flag filters. Each is opt-in, so an unset filter never narrows. ----
    if (filters.unreadOnly && c.unreadCount === 0) return false;
    if (filters.favouritesOnly && !c.isFavourite) return false;
    if (filters.campaignRepliesOnly && !c.isCampaignReply) return false;
    if (filters.adLeadsOnly && !c.isAdLead) return false;
    if (filters.missedCallsOnly && !c.hasMissedCall) return false;
    if (filters.windowClosedOnly && c.responseWindow.status !== 'expired') return false;
    if (
      filters.newLeadsOnly
      && (c.lifecycleStage === 'customer' || !['new', 'assigned'].includes(c.leadStatus ?? ''))
    ) {
      return false;
    }

    // "Waiting longer than X" is what makes a saved view like "hot leads
    // waiting over a day" possible. An answered thread is waiting for nobody,
    // so it never qualifies however old it is.
    if (filters.waitingLongerThanMinutes != null) {
      if (!c.awaitingSince) return false;
      const waited = (Date.now() - new Date(c.awaitingSince).getTime()) / 60_000;
      if (waited < filters.waitingLongerThanMinutes) return false;
    }
    if (
      filters.whatsappNumberIds.length > 0 &&
      !filters.whatsappNumberIds.includes(c.whatsappNumberId)
    ) {
      return false;
    }
    if (
      filters.replyStatuses.length > 0 &&
      !filters.replyStatuses.includes(c.replyStatus)
    ) {
      return false;
    }
    if (
      filters.responseWindowStatuses.length > 0 &&
      !filters.responseWindowStatuses.includes(c.responseWindow.status)
    ) {
      return false;
    }
    return true;
  });
}

// ---- Sorting -------------------------------------------------------------

export function sortConversations(
  conversations: InboxConversation[],
  sortKey: ConversationSortKey,
): InboxConversation[] {
  const copy = [...conversations];
  switch (sortKey) {
    case 'newest':
      return copy.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
    case 'oldest':
      return copy.sort((a, b) => a.lastMessageAt.localeCompare(b.lastMessageAt));
    case 'sla-urgent':
      return copy.sort((a, b) => {
        const aPriority = slaPriority(a);
        const bPriority = slaPriority(b);
        if (aPriority !== bPriority) return aPriority - bPriority;
        return b.lastMessageAt.localeCompare(a.lastMessageAt);
      });
    case 'unread':
      return copy.sort((a, b) => {
        if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
        return b.lastMessageAt.localeCompare(a.lastMessageAt);
      });
    default:
      return copy;
  }
}

function slaPriority(c: InboxConversation): number {
  if (c.sla.status === 'breached') return 0;
  if (c.sla.status === 'warning') return 1;
  if (c.responseWindow.status === 'expired') return 2;
  if (c.responseWindow.status === 'expiring') return 3;
  return 4;
}

// ---- Quick-view counts (for sidebar badges) -----------------------------

export interface QuickViewCount {
  key: QuickViewKey;
  label: string;
  count: number;
  /** Primary queues sit in the compact bar; `more` queues live under "More". */
  group: 'primary' | 'more';
}

export function quickViewCounts(
  scopedConversations: InboxConversation[],
  userId: string,
  role: RoleKey,
): QuickViewCount[] {
  // Spec §3/§4: primary queues stay compact; low-frequency queues move to More.
  const base: Array<{ key: QuickViewKey; label: string; group: 'primary' | 'more' }> = [
    { key: 'all', label: 'All Chats', group: 'primary' },
    { key: 'mine', label: 'Mine', group: 'primary' },
    { key: 'unassigned', label: 'Unassigned', group: 'primary' },
    { key: 'needs-reply', label: 'Needs Reply', group: 'primary' },
    { key: 'unread', label: 'Unread', group: 'primary' },
    { key: 'new-leads', label: 'New Leads', group: 'more' },
    { key: 'ad-leads', label: 'Ad Leads', group: 'more' },
    { key: 'campaign-replies', label: 'Campaign Replies', group: 'more' },
    { key: 'missed-calls', label: 'Missed Calls', group: 'more' },
    { key: 'favourites', label: 'Favourites', group: 'more' },
    { key: 'window-closed', label: 'Window Closed', group: 'more' },
    { key: 'pending', label: 'Pending', group: 'primary' },
    { key: 'overdue', label: 'Overdue', group: 'more' },
    { key: 'sla-breached', label: 'SLA Breached', group: 'more' },
    { key: 'resolved', label: 'Resolved', group: 'more' },
    { key: 'imported', label: 'Imported', group: 'more' },
    { key: 'blocked', label: 'Blocked', group: 'more' },
    ...(role !== 'agent' ? [{ key: 'spam' as QuickViewKey, label: 'Spam', group: 'more' as const }] : []),
  ];

  return base.map(({ key, label, group }) => ({
    key,
    label,
    group,
    count: applyQuickView(scopedConversations, key, userId).length,
  }));
}

// ---- Default view for a role --------------------------------------------

export function defaultViewForRole(role: RoleKey): QuickViewKey {
  return role === 'agent' ? 'mine' : 'all';
}

// ---- Message search ------------------------------------------------------

export interface MessageSearchResult {
  conversationId: string;
  messageId: string;
  snippet: string;
  matchStart: number;
  matchEnd: number;
}

export function searchConversationsByMessage(
  conversations: InboxConversation[],
  query: string,
  conversationMessages: Record<string, Array<{ id: string; text: string; direction: string; at: string; isNote: boolean }>>,
): { conversations: InboxConversation[]; results: MessageSearchResult[] } {
  if (!query.trim()) return { conversations, results: [] };
  const q = query.toLowerCase();
  const results: MessageSearchResult[] = [];
  const matchedConvIds = new Set<string>();

  for (const conv of conversations) {
    const msgs = conversationMessages[conv.id] ?? [];
    for (const msg of msgs) {
      if (!msg.text) continue;
      const idx = msg.text.toLowerCase().indexOf(q);
      if (idx === -1) continue;
      matchedConvIds.add(conv.id);
      const start = Math.max(0, idx - 30);
      const end = Math.min(msg.text.length, idx + q.length + 50);
      const prefix = start > 0 ? '…' : '';
      const suffix = end < msg.text.length ? '…' : '';
      results.push({
        conversationId: conv.id,
        messageId: msg.id,
        snippet: prefix + msg.text.slice(start, end) + suffix,
        matchStart: idx - start + prefix.length,
        matchEnd: idx - start + prefix.length + q.length,
      });
    }
  }

  return {
    conversations: conversations.filter((c) => matchedConvIds.has(c.id)),
    results,
  };
}

// ---- Contact search (conversation search) --------------------------------

export function searchConversationsByContact(
  conversations: InboxConversation[],
  query: string,
  contacts: Array<{ id: string; name: string; mobile: string }>,
): InboxConversation[] {
  if (!query.trim()) return conversations;
  const q = query.toLowerCase();
  const matchingContactIds = new Set(
    contacts
      .filter((c) => c.name.toLowerCase().includes(q) || c.mobile.includes(q))
      .map((c) => c.id),
  );
  return conversations.filter(
    (c) =>
      (c.contactId !== null && matchingContactIds.has(c.contactId)) ||
      (c.rawMobile !== null && c.rawMobile.includes(q)),
  );
}

// ---- Helpers -------------------------------------------------------------

export function getConversationsForView(
  role: RoleKey,
  userId: string,
  whatsappNumberId: string,
  branchId: string,
  view: QuickViewKey,
  filters: InboxFilterState,
  sortKey: ConversationSortKey,
): InboxConversation[] {
  const scoped = scopeConversations(allConversations, role, userId, whatsappNumberId, branchId);
  const viewed = applyQuickView(scoped, view, userId);
  const filtered = applyFilters(viewed, filters);
  return sortConversations(filtered, sortKey);
}
