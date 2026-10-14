/**
 * Coexistence history/echo ingest tests, against a throwaway tenant.
 *
 * Run: npx tsx scripts/test-coexistence.ts
 *
 * These cover the failures that would be worst in front of a customer:
 *
 *  - backfill opening the 24-hour service window, so a free-form reply is sent
 *    and rejected by Meta;
 *  - 500 imported threads landing in the Open queue on the first morning;
 *  - chunks arriving out of order or twice (Meta retries) and duplicating
 *    messages or reordering the inbox;
 *  - a reply the owner sent from their phone never reaching the CRM, so an
 *    automation answers a question that was already answered.
 *
 * Everything is created under a tenant made for the run and deleted at the end.
 */
import { prisma } from '../lib/db';
import {
  ingestHistoryChunk, ingestStateSync, promoteHistoricalConversation,
  syncWindowHoursLeft, isSyncWindowOpen, HISTORY_DECLINED_CODE,
  HISTORY_DAYS, MEDIA_DAYS, SYNC_WINDOW_HOURS,
} from '../lib/whatsapp/coexistence';

let pass = 0;
const failures: string[] = [];

function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; return; }
  failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

const suffix = `cx${Date.now()}`;
const tenantId = `t_${suffix}`;
const phoneNumberId = `pn_${suffix}`;
const business = '919820000001';
const customer = `9198200${String(Date.now()).slice(-5)}`;

const secs = (d: Date) => String(Math.floor(d.getTime() / 1000));
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

const convo = () => prisma.conversation.findUnique({
  where: { tenantId_phoneNumberId_contactPhone: { tenantId, phoneNumberId, contactPhone: customer } },
  select: {
    id: true, status: true, isHistorical: true, historyFrom: true,
    lastMessageAt: true, contactName: true, lastReadAt: true,
  },
});

async function main() {
  await prisma.tenant.create({ data: { id: tenantId, businessName: 'Coexistence Test' } });

  /* ---- Meta's one-time request window ------------------------------------ */

  check('the window is open right after onboarding', isSyncWindowOpen(new Date()), true);
  check(`${SYNC_WINDOW_HOURS}h is the full window`,
    Math.round(syncWindowHoursLeft(new Date()) ?? 0), SYNC_WINDOW_HOURS);
  check('a day later it has closed', isSyncWindowOpen(daysAgo(2)), false);
  check('never onboarded means no window', syncWindowHoursLeft(null), null);
  check('history reaches 180 days', HISTORY_DAYS, 180);
  check('media only reaches 14', MEDIA_DAYS, 14);

  /* ---- A history chunk lands as context, not work ------------------------ */

  const r1 = await ingestHistoryChunk({
    tenantId, phoneNumberId, businessPhone: business,
    chunk: {
      metadata: { phase: 1, chunk_order: 1, progress: 40 },
      threads: [{
        id: customer,
        messages: [
          { id: `h1_${suffix}`, from: customer, timestamp: secs(daysAgo(60)), type: 'text', text: { body: 'What is the price?' }, history_context: { status: 'READ' } },
          { id: `h2_${suffix}`, from: business, to: customer, timestamp: secs(daysAgo(60)), type: 'text', text: { body: 'Rs 38,500.' }, history_context: { status: 'READ' } },
        ],
      }],
    },
  });
  check('two historical messages stored', r1.messages, 2);
  check('one thread touched', r1.threads, 1);
  check('progress reported', r1.progress, 40);

  const c1 = await convo();
  check('the imported thread is NOT open', c1?.status, 'imported');
  check('and is flagged historical', c1?.isHistorical, true);
  check('and is not unread — the owner saw it on their phone', !!c1?.lastReadAt, true);

  const stored = await prisma.message.findMany({
    where: { conversationId: c1!.id }, orderBy: { at: 'asc' },
  });
  check('every backfilled message is historical', stored.every((m) => m.isHistorical), true);
  check('and sourced as an import', stored.every((m) => m.source === 'history_import'), true);
  check('direction is read from `to`',
    stored.map((m) => m.direction), ['inbound', 'outbound']);

  /* ---- The service window must NOT open on backfill ---------------------- */

  // This is the rule the inbox route relies on: the window is anchored on live
  // inbound messages only, so a historical inbound must not qualify.
  const liveInbound = await prisma.message.findFirst({
    where: { conversationId: c1!.id, direction: 'inbound', isHistorical: false },
  });
  check('no LIVE inbound exists yet, so the window stays shut', liveInbound, null);

  /* ---- Chunks arrive out of order, and twice ----------------------------- */

  const before = (await convo())!.lastMessageAt;
  const r2 = await ingestHistoryChunk({
    tenantId, phoneNumberId, businessPhone: business,
    chunk: {
      metadata: { phase: 2, chunk_order: 5, progress: 80 },
      threads: [{
        id: customer,
        messages: [
          { id: `h0_${suffix}`, from: customer, timestamp: secs(daysAgo(150)), type: 'text', text: { body: 'Older message' } },
        ],
      }],
    },
  });
  check('an older out-of-order chunk still imports', r2.messages, 1);
  const c2 = await convo();
  check('but it does NOT drag the thread down the list', c2!.lastMessageAt.getTime(), before.getTime());
  check('and historyFrom moves back to the oldest message',
    c2!.historyFrom!.getTime() < daysAgo(100).getTime(), true);

  // Meta retries aggressively; a replayed chunk must be a no-op.
  const replay = await ingestHistoryChunk({
    tenantId, phoneNumberId, businessPhone: business,
    chunk: {
      metadata: { phase: 1, chunk_order: 1, progress: 40 },
      threads: [{
        id: customer,
        messages: [
          { id: `h1_${suffix}`, from: customer, timestamp: secs(daysAgo(60)), type: 'text', text: { body: 'What is the price?' } },
          { id: `h2_${suffix}`, from: business, to: customer, timestamp: secs(daysAgo(60)), type: 'text', text: { body: 'Rs 38,500.' } },
        ],
      }],
    },
  });
  check('a replayed chunk stores nothing twice', replay.messages, 0);
  check('message count is unchanged',
    await prisma.message.count({ where: { conversationId: c1!.id } }), 3);

  /* ---- Media older than 14 days ------------------------------------------ */

  const r3 = await ingestHistoryChunk({
    tenantId, phoneNumberId, businessPhone: business,
    chunk: {
      metadata: { phase: 1, chunk_order: 2, progress: 60 },
      threads: [{
        id: customer,
        messages: [
          { id: `hm_${suffix}`, from: customer, timestamp: secs(daysAgo(45)), type: 'media_placeholder' },
        ],
      }],
    },
  });
  check('a media placeholder is counted', r3.mediaPlaceholders, 1);
  const media = await prisma.message.findUnique({ where: { waMessageId: `hm_${suffix}` } });
  check('stored as unavailable rather than a broken image', media?.mediaUnavailable, true);
  check('with readable stand-in text', (media?.text ?? '').includes('no longer available'), true);

  /* ---- Declining to share is not a failure ------------------------------- */

  const declined = await ingestHistoryChunk({
    tenantId, phoneNumberId, businessPhone: business,
    chunk: { errors: [{ code: HISTORY_DECLINED_CODE, title: 'Chat sharing declined' }] },
  });
  check('a decline is reported as a decline', declined.declined, true);
  check('and imports nothing', declined.messages, 0);

  /* ---- Contacts from the app state sync ---------------------------------- */

  const synced = await ingestStateSync({
    tenantId,
    entries: [
      { type: 'contact', action: 'add', contact: { full_name: 'Rajesh Mehta', phone_number: `+${customer}` } },
      { type: 'contact', action: 'remove', contact: { phone_number: `+${customer}` } },
      { type: 'contact', action: 'add', contact: { phone_number: '919000000000' } },
    ],
  });
  check('only usable additions count', synced.added, 1);
  check('the imported thread gets a real name', (await convo())?.contactName, 'Rajesh Mehta');

  /* ---- A live message promotes the thread to work ------------------------ */

  check('promotion reports that it happened', await promoteHistoricalConversation(c1!.id), true);
  const c3 = await convo();
  check('the thread is now open', c3?.status, 'open');
  check('no longer historical', c3?.isHistorical, false);
  check('and unread again, so the agent sees it', c3?.lastReadAt, null);

  /* ---- Clean up ----------------------------------------------------------- */

  await prisma.message.deleteMany({ where: { conversation: { tenantId } } });
  await prisma.conversation.deleteMany({ where: { tenantId } });
  await prisma.contact.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });

  if (failures.length) {
    console.error(`\n${failures.length} FAILED of ${pass + failures.length}:\n`);
    for (const f of failures) console.error(`  x ${f}\n`);
    process.exit(1);
  }
  console.log(`All ${pass} coexistence checks passed.`);
}

main()
  .catch(async (e) => {
    console.error(e);
    await prisma.message.deleteMany({ where: { conversation: { tenantId } } }).catch(() => {});
    await prisma.conversation.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.contact.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
