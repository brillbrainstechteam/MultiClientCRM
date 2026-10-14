import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { graphBase } from '@/lib/meta/config';

/**
 * Coexistence: keeping the WhatsApp Business app and the Cloud API on one
 * number, and backfilling what was there before.
 *
 * The shape of the thing, from Meta's own docs:
 *
 *  - After onboarding, a provider may ask for TWO syncs by POSTing to
 *    `/{phone-number-id}/smb_app_data` with `sync_type` of `smb_app_state_sync`
 *    (contacts) or `history` (messages).
 *  - **Each may be requested exactly once, and only within 24 hours of
 *    onboarding.** Miss the window or ask twice and the only recovery is for
 *    the customer to offboard and repeat Embedded Signup. That single fact
 *    drives most of the design here: the request fires automatically the moment
 *    onboarding completes, never from a button the owner might find next week.
 *  - History covers **180 days** of 1:1 chats. Groups, broadcast lists, labels,
 *    greeting/away messages and the app's own quick replies do not come across.
 *  - Media asset ids arrive only for media from the **14 days** before
 *    onboarding. Older media messages arrive as a `media_placeholder` — a
 *    record that something was sent, with no retrievable file.
 *  - History is delivered in three phases (0: day 0-1, 1: day 1-90, 2: day
 *    90-180), each possibly split into chunks, and **chunks can arrive out of
 *    order**. Nothing may assume sequence.
 *  - If the customer declines sharing, the history webhook carries an error
 *    with code 2593109 rather than any threads.
 *
 * Everything backfilled is marked historical, which is what keeps it out of the
 * Open queue, out of automations, and — critically — out of the 24-hour service
 * window calculation. A three-month-old "what is the price?" must never make
 * the CRM think it may send a free-form message today.
 */

/** Meta's error code for "the business declined to share chat history". */
export const HISTORY_DECLINED_CODE = 2593109;
/** Meta's window to request both syncs after onboarding. */
export const SYNC_WINDOW_HOURS = 24;
/** How far back history reaches. */
export const HISTORY_DAYS = 180;
/** How far back media is actually retrievable. */
export const MEDIA_DAYS = 14;

export type SyncType = 'smb_app_state_sync' | 'history';

export type MessageSource =
  | 'customer' | 'crm_agent' | 'whatsapp_business_app' | 'automation'
  | 'ai_agent' | 'campaign' | 'history_import' | 'external_crm_import';

const digits = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '');

/** Hours left in Meta's one-time request window, or null when unknown. */
export function syncWindowHoursLeft(onboardedAt: Date | null, now = new Date()): number | null {
  if (!onboardedAt) return null;
  const used = (now.getTime() - onboardedAt.getTime()) / 3_600_000;
  return Math.max(0, SYNC_WINDOW_HOURS - used);
}

export function isSyncWindowOpen(onboardedAt: Date | null, now = new Date()): boolean {
  const left = syncWindowHoursLeft(onboardedAt, now);
  return left === null ? false : left > 0;
}

/* ---- Requesting the syncs ------------------------------------------------- */

/**
 * Ask Meta for one of the two syncs.
 *
 * Returns the request_id to store for support. Never throws: a failed backfill
 * must not fail the connection — the number still works, the customer simply
 * starts without their old chats, and the state records why.
 */
export async function requestSmbSync(input: {
  phoneNumberId: string;
  accessToken: string;
  syncType: SyncType;
}): Promise<{ ok: true; requestId: string | null } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${graphBase()}/${input.phoneNumberId}/smb_app_data`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${input.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', sync_type: input.syncType }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      request_id?: string; error?: { message?: string };
    };
    if (!res.ok) return { ok: false, error: json.error?.message ?? `Meta refused the ${input.syncType} request.` };
    return { ok: true, requestId: json.request_id ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not reach Meta.' };
  }
}

/**
 * Kick off both syncs for a freshly-onboarded coexistence number.
 *
 * Called straight from the onboarding callback. Contacts first — they are small
 * and make the imported threads show real names instead of bare numbers — then
 * history, which streams in over the following minutes.
 */
export async function startCoexistenceSync(accountId: string): Promise<void> {
  const account = await prisma.whatsAppAccount.findUnique({ where: { id: accountId } });
  if (!account?.phoneNumberId || !account.accessToken) return;
  if (account.connectionMode !== 'coexistence') return;
  // Each sync type is one-shot. Re-requesting burns the customer's only chance.
  if (account.historySyncStatus !== 'not_started' && account.contactsSyncStatus !== 'not_started') return;

  const token = decrypt(account.accessToken);
  const now = new Date();
  const onboardedAt = account.onboardedAt ?? now;
  if (!account.onboardedAt) {
    await prisma.whatsAppAccount.update({ where: { id: accountId }, data: { onboardedAt } });
  }

  if (account.contactsSyncStatus === 'not_started') {
    const r = await requestSmbSync({ phoneNumberId: account.phoneNumberId, accessToken: token, syncType: 'smb_app_state_sync' });
    await prisma.whatsAppAccount.update({
      where: { id: accountId },
      data: r.ok
        ? { contactsSyncStatus: 'requested', contactsRequestId: r.requestId }
        : { contactsSyncStatus: 'failed', contactsError: r.error },
    });
  }

  if (account.historySyncStatus === 'not_started') {
    const r = await requestSmbSync({ phoneNumberId: account.phoneNumberId, accessToken: token, syncType: 'history' });
    await prisma.whatsAppAccount.update({
      where: { id: accountId },
      data: r.ok
        ? { historySyncStatus: 'requested', historyRequestId: r.requestId, historyStartedAt: now }
        : { historySyncStatus: 'failed', historyError: r.error },
    });
  }
}

/**
 * Move a stuck sync to `expired` once Meta's window has closed.
 *
 * Retrying is pointless after that — Meta only allows the request inside the
 * window — so the UI must offer reconnection rather than a retry button.
 */
export async function expireStaleSyncs(tenantId: string, now = new Date()): Promise<void> {
  const accounts = await prisma.whatsAppAccount.findMany({
    where: {
      tenantId,
      connectionMode: 'coexistence',
      OR: [
        { historySyncStatus: { in: ['requested', 'syncing'] } },
        { contactsSyncStatus: { in: ['requested', 'syncing'] } },
      ],
    },
    select: { id: true, onboardedAt: true, historySyncStatus: true, contactsSyncStatus: true, historyMessages: true },
  });
  for (const a of accounts) {
    if (isSyncWindowOpen(a.onboardedAt, now)) continue;
    await prisma.whatsAppAccount.update({
      where: { id: a.id },
      data: {
        // Something arrived but Meta never said 100% — that is partial, not failed.
        ...(['requested', 'syncing'].includes(a.historySyncStatus)
          ? { historySyncStatus: a.historyMessages > 0 ? 'partial' : 'expired' }
          : {}),
        ...(['requested', 'syncing'].includes(a.contactsSyncStatus) ? { contactsSyncStatus: 'expired' } : {}),
      },
    });
  }
}

/* ---- Processing the history webhook --------------------------------------- */

export interface HistoryMessage {
  from?: string;
  to?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  history_context?: { status?: string };
}

export interface HistoryChunk {
  metadata?: { phase?: number; chunk_order?: number; progress?: number };
  threads?: Array<{ id?: string; messages?: HistoryMessage[] }>;
  errors?: Array<{ code?: number; title?: string; message?: string }>;
}

export interface HistoryIngestResult {
  threads: number;
  messages: number;
  mediaPlaceholders: number;
  declined: boolean;
  progress: number | null;
  phase: number | null;
}

/** A readable stand-in for media Meta can no longer hand over. */
function placeholderText(type: string): string {
  const noun = type === 'image' ? 'image'
    : type === 'video' ? 'video'
    : type === 'audio' ? 'voice message'
    : type === 'document' ? 'document'
    : type === 'sticker' ? 'sticker'
    : 'attachment';
  return `[Older WhatsApp ${noun} — the original is no longer available through the history sync]`;
}

/**
 * Fold one history chunk into the inbox.
 *
 * Deliberately idempotent and order-independent: chunks may arrive out of
 * sequence and Meta retries aggressively, so every message is keyed on its
 * wamid and skipped if already stored. Conversations are created in the
 * `imported` state, and `lastMessageAt` only ever moves forward — a chunk of
 * three-month-old messages must not drag a live thread back down the list.
 */
export async function ingestHistoryChunk(input: {
  tenantId: string;
  phoneNumberId: string;
  businessPhone: string;
  chunk: HistoryChunk;
}): Promise<HistoryIngestResult> {
  const { tenantId, phoneNumberId, chunk } = input;
  const business = digits(input.businessPhone);
  const out: HistoryIngestResult = {
    threads: 0, messages: 0, mediaPlaceholders: 0, declined: false,
    progress: chunk.metadata?.progress ?? null,
    phase: chunk.metadata?.phase ?? null,
  };

  if (chunk.errors?.some((e) => e.code === HISTORY_DECLINED_CODE)) {
    out.declined = true;
    return out;
  }

  for (const thread of chunk.threads ?? []) {
    const contactPhone = digits(thread.id);
    if (!contactPhone) continue;

    const existing = await prisma.conversation.findUnique({
      where: { tenantId_phoneNumberId_contactPhone: { tenantId, phoneNumberId, contactPhone } },
      select: { id: true, isHistorical: true, historyFrom: true, lastMessageAt: true, status: true },
    });

    const convo = existing ?? await prisma.conversation.create({
      data: {
        tenantId, phoneNumberId, contactPhone,
        // Imported, not open: context without manufacturing work.
        status: 'imported',
        isHistorical: true,
        // Backfill is already read by definition — the owner saw it on their phone.
        lastReadAt: new Date(),
        lastMessageAt: new Date(0),
      },
      select: { id: true, isHistorical: true, historyFrom: true, lastMessageAt: true, status: true },
    });
    out.threads += 1;

    let oldest: Date | null = convo.historyFrom;
    let newest: Date | null = null;

    for (const m of thread.messages ?? []) {
      if (!m.id) continue;
      const at = m.timestamp ? new Date(Number(m.timestamp) * 1000) : new Date();
      if (Number.isNaN(at.getTime())) continue;

      // `to` is present only on messages the business sent.
      const outbound = !!m.to || (!!m.from && digits(m.from) === business);
      const type = m.type ?? 'text';
      const isPlaceholder = type === 'media_placeholder';
      if (isPlaceholder) out.mediaPlaceholders += 1;

      const text = m.text?.body
        ?? (isPlaceholder ? placeholderText(type) : type === 'text' ? '' : `[${type}]`);

      try {
        await prisma.message.create({
          data: {
            conversationId: convo.id,
            waMessageId: m.id,
            direction: outbound ? 'outbound' : 'inbound',
            type: isPlaceholder ? 'media_placeholder' : type,
            text,
            status: m.history_context?.status?.toLowerCase() ?? null,
            source: 'history_import',
            isHistorical: true,
            mediaUnavailable: isPlaceholder,
            at,
          },
        });
        out.messages += 1;
      } catch {
        // Unique waMessageId: a duplicate chunk or a Meta retry. Expected.
        continue;
      }

      if (!oldest || at < oldest) oldest = at;
      if (!newest || at > newest) newest = at;
    }

    await prisma.conversation.update({
      where: { id: convo.id },
      data: {
        ...(oldest && (!convo.historyFrom || oldest < convo.historyFrom) ? { historyFrom: oldest } : {}),
        // Only ever forward: a late chunk of old messages must not reorder the list.
        ...(newest && newest > convo.lastMessageAt ? { lastMessageAt: newest } : {}),
      },
    });
  }

  return out;
}

/**
 * Promote an imported thread the moment a live message arrives on it.
 *
 * This is the whole point of keeping backfill out of the queue: the context is
 * there from day one, but the thread only becomes work when the customer
 * actually writes. Returns true when a promotion happened.
 */
export async function promoteHistoricalConversation(conversationId: string): Promise<boolean> {
  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, isHistorical: true, status: true },
  });
  if (!convo?.isHistorical && convo?.status !== 'imported') return false;
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { isHistorical: false, status: 'open', lastReadAt: null },
  });
  return true;
}

/* ---- Contacts (smb_app_state_sync) ---------------------------------------- */

export interface StateSyncEntry {
  type?: string;
  contact?: { full_name?: string; first_name?: string; phone_number?: string };
  action?: string;
  metadata?: { timestamp?: string };
}

/**
 * Apply contact add/remove entries from the app state sync.
 *
 * Only names are touched. A removal in the owner's phone book is not a reason
 * to delete a CRM contact — the business relationship is ours, not the phone's
 * — so `remove` is recorded by doing nothing to the record itself.
 */
export async function ingestStateSync(input: {
  tenantId: string;
  entries: StateSyncEntry[];
}): Promise<{ added: number }> {
  let added = 0;
  for (const e of input.entries) {
    if (e.type !== 'contact' || e.action !== 'add') continue;
    const phone = digits(e.contact?.phone_number);
    const name = (e.contact?.full_name || e.contact?.first_name || '').trim();
    if (!phone || !name) continue;

    // The phone book is the best name we have for an imported thread.
    await prisma.conversation.updateMany({
      where: { tenantId: input.tenantId, contactPhone: phone, contactName: null },
      data: { contactName: name },
    });
    await prisma.contact.updateMany({
      where: { tenantId: input.tenantId, phone, name: null },
      data: { name },
    });
    added += 1;
  }
  return { added };
}
