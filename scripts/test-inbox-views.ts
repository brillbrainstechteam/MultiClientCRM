/**
 * Inbox view and filter tests.
 *
 * Run: npx tsx scripts/test-inbox-views.ts
 *
 * Most of these guard claims the UI was already making and could not keep. SLA
 * was hardcoded to "ok", so Overdue and SLA Breached matched nothing while
 * looking like working controls; the quick views knew nothing about imported,
 * blocked or spam threads. A filter that silently returns the wrong list is
 * worse than one that is missing, because nobody checks it twice.
 *
 * Pure selector logic — no database, no network.
 */
import { applyQuickView, applyFilters } from '../crm/modules/inbox/inbox-selectors';
import { emptyFilterState, isFilterActive } from '../crm/modules/inbox/inbox-types';
import type { InboxConversation } from '../crm/modules/inbox/inbox-types';

let pass = 0;
const failures: string[] = [];

function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; return; }
  failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

function convo(over: Partial<InboxConversation> & { id: string }): InboxConversation {
  return {
    contactId: null,
    rawMobile: '+919820000000',
    whatsappNumberId: 'wa1',
    assigneeId: null,
    teamId: null,
    botOwned: false,
    status: 'open',
    unreadCount: 0,
    labelIds: [],
    replyStatus: 'none',
    responseWindow: { status: 'active', expiresAt: null, remainingMinutes: 600, canSendFreeform: true },
    sla: { status: 'ok', deadline: null, minutesRemaining: null },
    preview: { text: '', isIncoming: false, isNote: false, at: ago(5) },
    isSpam: false,
    aiTaskCount: 0,
    firstMessageAt: ago(100),
    lastMessageAt: ago(5),
    ...over,
  } as InboxConversation;
}

const ids = (list: InboxConversation[]) => list.map((c) => c.id).sort();

/* ---- The working queues exclude what is not work -------------------------- */

const base = [
  convo({ id: 'open' }),
  convo({ id: 'imported', status: 'imported' }),
  convo({ id: 'spam', isSpam: true }),
  convo({ id: 'blocked', isBlocked: true }),
];

check('All Chats shows only live threads',
  ids(applyQuickView(base, 'all', 'u1')), ['open']);
check('imported stays out of All Chats',
  applyQuickView(base, 'all', 'u1').some((c) => c.id === 'imported'), false);
check('blocked stays out of All Chats',
  applyQuickView(base, 'all', 'u1').some((c) => c.id === 'blocked'), false);
check('Imported is reachable on purpose',
  ids(applyQuickView(base, 'imported', 'u1')), ['imported']);
check('Blocked is reachable on purpose',
  ids(applyQuickView(base, 'blocked', 'u1')), ['blocked']);
check('Spam is reachable on purpose',
  ids(applyQuickView(base, 'spam', 'u1')), ['spam']);

/* ---- Unread ---------------------------------------------------------------- */

const unread = [
  convo({ id: 'a', unreadCount: 3 }),
  convo({ id: 'b', unreadCount: 0 }),
  convo({ id: 'c', unreadCount: 1, status: 'imported' }),
];
check('Unread shows only threads with unread messages',
  ids(applyQuickView(unread, 'unread', 'u1')), ['a']);
check('an imported thread is never unread work',
  applyQuickView(unread, 'unread', 'u1').some((c) => c.id === 'c'), false);

/* ---- New leads -------------------------------------------------------------- */

const leads = [
  convo({ id: 'new', leadStatus: 'new' }),
  convo({ id: 'assigned', leadStatus: 'assigned' }),
  convo({ id: 'engaged', leadStatus: 'engaged' }),
  convo({ id: 'customer', leadStatus: 'new', lifecycleStage: 'customer' }),
  convo({ id: 'nocontact' }),
];
check('New Leads covers new and assigned',
  ids(applyQuickView(leads, 'new-leads', 'u1')), ['assigned', 'new']);
check('an engaged lead is not a new one',
  applyQuickView(leads, 'new-leads', 'u1').some((c) => c.id === 'engaged'), false);
check('an existing customer is never a new lead',
  applyQuickView(leads, 'new-leads', 'u1').some((c) => c.id === 'customer'), false);
check('a thread with no linked contact is not a lead',
  applyQuickView(leads, 'new-leads', 'u1').some((c) => c.id === 'nocontact'), false);

/* ---- Ads, campaigns, calls, favourites ------------------------------------- */

const mixed = [
  convo({ id: 'ad', isAdLead: true }),
  convo({ id: 'campaign', isCampaignReply: true }),
  convo({ id: 'missed', hasMissedCall: true }),
  convo({ id: 'fav', isFavourite: true }),
  convo({ id: 'plain' }),
];
check('Ad Leads', ids(applyQuickView(mixed, 'ad-leads', 'u1')), ['ad']);
check('Campaign Replies', ids(applyQuickView(mixed, 'campaign-replies', 'u1')), ['campaign']);
check('Missed Calls', ids(applyQuickView(mixed, 'missed-calls', 'u1')), ['missed']);
check('Favourites', ids(applyQuickView(mixed, 'favourites', 'u1')), ['fav']);

// Starring a thread is a deliberate act, so it stays findable even once
// resolved or blocked — that is what starring it was for.
const starredBlocked = [convo({ id: 'sb', isFavourite: true, isBlocked: true })];
check('a starred thread stays in Favourites even when blocked',
  ids(applyQuickView(starredBlocked, 'favourites', 'u1')), ['sb']);

/* ---- Window closed — Meta's 24-hour rule ----------------------------------- */

const windows = [
  convo({ id: 'openwin' }),
  convo({
    id: 'closed',
    responseWindow: { status: 'expired', expiresAt: ago(10), remainingMinutes: 0, canSendFreeform: false },
  }),
];
check('Window Closed finds threads needing a template',
  ids(applyQuickView(windows, 'window-closed', 'u1')), ['closed']);

/* ---- Filters compose ------------------------------------------------------- */

const pool = [
  convo({ id: 'hot-waiting', labelIds: ['lbl_hot_lead'], awaitingSince: ago(2000), unreadCount: 2 }),
  convo({ id: 'hot-fresh', labelIds: ['lbl_hot_lead'], awaitingSince: ago(10) }),
  convo({ id: 'cold-waiting', awaitingSince: ago(2000) }),
];

// This is the saved view the whole feature exists for.
const hotWaitingOverADay = {
  ...emptyFilterState(),
  labelIds: ['lbl_hot_lead'],
  waitingLongerThanMinutes: 1440,
};
check('"hot leads waiting over a day" matches only that',
  ids(applyFilters(pool, hotWaitingOverADay)), ['hot-waiting']);
check('a thread waiting ten minutes does not qualify',
  applyFilters(pool, hotWaitingOverADay).some((c) => c.id === 'hot-fresh'), false);
check('a cold lead waiting just as long does not qualify',
  applyFilters(pool, hotWaitingOverADay).some((c) => c.id === 'cold-waiting'), false);

check('an answered thread is waiting for nobody',
  applyFilters(
    [convo({ id: 'answered' })],
    { ...emptyFilterState(), waitingLongerThanMinutes: 1 },
  ).length, 0);

check('unreadOnly narrows',
  ids(applyFilters(pool, { ...emptyFilterState(), unreadOnly: true })),
  ['hot-waiting']);
check('an empty filter state narrows nothing',
  applyFilters(pool, emptyFilterState()).length, 3);

/* ---- isFilterActive must see the new filters ------------------------------- */

check('a default state is not active', isFilterActive(emptyFilterState()), false);
check('waiting-longer-than counts as active',
  isFilterActive({ ...emptyFilterState(), waitingLongerThanMinutes: 1440 }), true);
check('unreadOnly counts as active',
  isFilterActive({ ...emptyFilterState(), unreadOnly: true }), true);
check('adLeadsOnly counts as active',
  isFilterActive({ ...emptyFilterState(), adLeadsOnly: true }), true);
check('favouritesOnly counts as active',
  isFilterActive({ ...emptyFilterState(), favouritesOnly: true }), true);

/* ---- Report ----------------------------------------------------------------- */

if (failures.length) {
  console.error(`\n${failures.length} FAILED of ${pass + failures.length}:\n`);
  for (const f of failures) console.error(`  x ${f}\n`);
  process.exit(1);
}
console.log(`All ${pass} inbox view/filter checks passed.`);
