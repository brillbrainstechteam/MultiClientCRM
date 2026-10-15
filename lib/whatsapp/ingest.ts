import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { runInboundAutomations } from '@/lib/crm/automation';
import {
  classifyConsentReply, recordConsent, consentStage, REQUEST_WINDOW_DAYS,
} from '@/lib/crm/consent';
import { routeLocation } from '@/lib/crm/zone-routing';
import { notify, type NotifySeverity } from '@/lib/billing/notify';
import { applyTemplateEvent, syncTemplatesFromMeta } from '@/lib/meta/template-cache';
import {
  ingestHistoryChunk, ingestStateSync, promoteHistoricalConversation,
  type HistoryChunk, type StateSyncEntry,
} from '@/lib/whatsapp/coexistence';
import { readReferral, applyReferralToContact, describeReferral } from '@/lib/whatsapp/referral';

/**
 * Routing for a WhatsApp webhook payload.
 *
 * A single POST can carry several `entry` objects, each with several `changes`,
 * and each change has a `field` that says what kind of event it is. We iterate
 * all of them and dispatch by field:
 *
 *   messages                        inbound messages + delivery statuses
 *   history                         coexistence backfill (180 days of 1:1 chats)
 *   smb_message_echoes              messages the owner sent from the Business app
 *   smb_app_state_sync              the Business app's contact list
 *   message_template_status_update  a template was approved / rejected / paused / disabled
 *   template_category_update        Meta re-categorised a template (changes pricing)
 *   message_template_components_update  a template's header/body/buttons were edited
 *   message_template_quality_update a template's quality score changed
 *   phone_number_quality_update     a number's quality rating / limit changed
 *   phone_number_name_update        a display-name review completed
 *   account_update                  account violation / restriction / coexistence offboard-reconnect
 *   account_alerts                  scaling / eligibility alerts
 *   calls                           WhatsApp Calling events (parsed in the Calling phase)
 *   group_*                         Groups events (parsed in the Groups phase)
 *
 * Messaging events route by `metadata.phone_number_id`; account/template/quality
 * events route by the WABA id (`entry.id`). Actionable events are surfaced to the
 * tenant through the NotificationEvent feed, and health changes are written back
 * onto the WhatsAppAccount row.
 *
 * Kept separate from the webhook route so the same code can be replayed over
 * stored WebhookEvent rows by the diagnostics page — the route deliberately
 * swallows errors (Meta retries hard on non-200), which makes a routing bug
 * invisible in production. Here failures are collected and returned.
 */

export interface IngestResult {
  phoneNumberId: string | null;
  tenantId: string | null;
  inboundSeen: number;
  statusesSeen: number;
  conversationsTouched: number;
  messagesStored: number;
  /** Template / account / quality / alert webhooks turned into notifications. */
  systemEventsSeen: number;
  /** Calling events seen (handled by the Calling phase; raw event is persisted). */
  callsSeen: number;
  /** Groups events seen (handled by the Groups phase; raw event is persisted). */
  groupsSeen: number;
  /** Fields we received but do not act on yet. */
  unhandledFields: string[];
  errors: string[];
}

interface ResolvedAccount {
  id: string;
  tenantId: string;
  phoneNumberId: string | null;
  wabaId: string | null;
  accessToken: string | null;
  displayPhone: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Resolve the owning account/tenant from a phone_number_id or, failing that, a WABA id. */
async function resolveAccount(phoneNumberId?: string | null, wabaId?: string | null): Promise<ResolvedAccount | null> {
  const pick = { id: true, tenantId: true, phoneNumberId: true, wabaId: true, accessToken: true, displayPhone: true } as const;
  if (phoneNumberId) {
    const acc =
      (await prisma.whatsAppAccount.findFirst({ where: { phoneNumberId, status: 'connected' }, orderBy: { connectedAt: 'desc' }, select: pick })) ??
      (await prisma.whatsAppAccount.findFirst({ where: { phoneNumberId }, orderBy: { connectedAt: 'desc' }, select: pick }));
    if (acc) return acc;
  }
  if (wabaId) {
    const acc =
      (await prisma.whatsAppAccount.findFirst({ where: { wabaId, status: 'connected' }, orderBy: { connectedAt: 'desc' }, select: pick })) ??
      (await prisma.whatsAppAccount.findFirst({ where: { wabaId }, orderBy: { connectedAt: 'desc' }, select: pick }));
    if (acc) return acc;
  }
  return null;
}

export async function ingestWebhookPayload(payload: any): Promise<IngestResult> {
  const result: IngestResult = {
    phoneNumberId: null,
    tenantId: null,
    inboundSeen: 0,
    statusesSeen: 0,
    conversationsTouched: 0,
    messagesStored: 0,
    systemEventsSeen: 0,
    callsSeen: 0,
    groupsSeen: 0,
    unhandledFields: [],
    errors: [],
  };

  const entries: any[] = payload?.entry ?? [];
  if (entries.length === 0) {
    result.errors.push('Payload has no entry[] — nothing to route.');
    return result;
  }

  for (const entry of entries) {
    const wabaId: string | undefined = entry?.id;
    for (const change of entry?.changes ?? []) {
      const field: string = change?.field ?? '';
      const value = change?.value ?? {};
      const phoneNumberId: string | undefined = value?.metadata?.phone_number_id;
      if (phoneNumberId && !result.phoneNumberId) result.phoneNumberId = phoneNumberId;

      try {
        if (field === 'messages') {
          const account = await resolveAccount(phoneNumberId, wabaId);
          if (!account) { result.errors.push(`No WhatsAppAccount owns phone_number_id ${phoneNumberId ?? '?'} / waba ${wabaId ?? '?'}.`); continue; }
          result.tenantId = account.tenantId;
          await handleMessages(value, account, result);
          await handleStatuses(value, result);
          continue;
        }

        // Every other field is a WABA-level account/template event.
        const account = await resolveAccount(phoneNumberId, wabaId);
        if (!account) { result.errors.push(`No WhatsAppAccount owns waba ${wabaId ?? '?'} for field "${field}".`); continue; }
        result.tenantId = account.tenantId;

        switch (field) {
          // ---- Coexistence ---------------------------------------------
          case 'history':
            await handleHistory(value, account, result); break;
          case 'smb_message_echoes':
            await handleMessageEchoes(value, account, result); break;
          case 'smb_app_state_sync':
            await handleStateSync(value, account, result); break;
          case 'message_template_status_update':
            await handleTemplateStatus(value, account, result); break;
          case 'template_category_update':
            await handleTemplateCategory(value, account, result); break;
          case 'message_template_quality_update':
            await handleTemplateQuality(value, account, result); break;
          case 'message_template_components_update':
            await handleTemplateComponents(value, account, result); break;
          case 'phone_number_quality_update':
            await handleNumberQuality(value, account, result); break;
          case 'phone_number_name_update':
            await handleNumberName(value, account, result); break;
          case 'account_update':
            await handleAccountUpdate(value, account, result); break;
          case 'account_alerts':
            await handleAccountAlerts(value, account, result); break;
          case 'calls':
            // Signalling/media handled in the Calling phase; the raw event is
            // already persisted (WebhookEvent) so nothing is lost.
            result.callsSeen += 1; break;
          default:
            if (field.startsWith('group')) { result.groupsSeen += 1; break; }
            if (!result.unhandledFields.includes(field)) result.unhandledFields.push(field);
        }
      } catch (e) {
        result.errors.push(`Field "${field}": ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  return result;
}

// ---- messaging ------------------------------------------------------------

async function handleMessages(value: any, account: ResolvedAccount, result: IngestResult): Promise<void> {
  const { tenantId } = account;
  const phoneNumberId = value?.metadata?.phone_number_id ?? account.phoneNumberId ?? '';

  const nameByWaId: Record<string, string> = {};
  for (const c of value?.contacts ?? []) {
    if (c?.wa_id) nameByWaId[c.wa_id] = c?.profile?.name ?? '';
  }

  for (const m of value?.messages ?? []) {
    result.inboundSeen += 1;
    try {
      const from: string = m.from;
      const text: string = m.text?.body ?? `[${m.type ?? 'message'}]`;
      const at = m.timestamp ? new Date(Number(m.timestamp) * 1000) : new Date();
      // Present only on the first message after someone taps a Click-to-
      // WhatsApp ad. It arrives on this ordinary messages webhook — no extra
      // product is needed to receive it.
      const referral = readReferral(m);

      const convo = await prisma.conversation.upsert({
        where: { tenantId_phoneNumberId_contactPhone: { tenantId, phoneNumberId, contactPhone: from } },
        update: { lastMessageAt: at, contactName: nameByWaId[from] || undefined },
        create: { tenantId, phoneNumberId, contactPhone: from, contactName: nameByWaId[from] || null, lastMessageAt: at },
      });
      result.conversationsTouched += 1;

      // A live message on an imported thread is the moment it becomes work:
      // it leaves the `imported` state, joins the Open queue, and from here on
      // assignment, SLA and automations apply to it as normal.
      const promoted = await promoteHistoricalConversation(convo.id).catch(() => false);
      if (promoted) result.systemEventsSeen += 1;

      await prisma.contact.upsert({
        where: { tenantId_phone: { tenantId, phone: from } },
        update: { lastMessageAt: at, name: nameByWaId[from] || undefined },
        create: { tenantId, phone: from, name: nameByWaId[from] || null, lastMessageAt: at },
      });

      // Zone routing on first touch: City → State → Zone → member. One member in
      // the zone = auto-assign; several = leave for the admin to pick. Best-effort.
      if (!convo.assigneeUserId && !convo.zoneId) {
        try {
          const crm = await prisma.crmContact.findFirst({
            where: { tenantId, mobile: { in: [`+${from}`, from] } },
            select: { id: true, city: true, state: true },
          });
          const route = await routeLocation(tenantId, crm?.city, crm?.state);
          if (route.zoneId) {
            await prisma.conversation.update({
              where: { id: convo.id },
              data: { zoneId: route.zoneId, ...(route.assigneeUserId ? { assigneeUserId: route.assigneeUserId } : {}) },
            });
            if (crm) {
              await prisma.crmContact.update({
                where: { id: crm.id },
                data: { zone: route.zoneName ?? undefined, ...(route.assigneeUserId ? { ownerId: route.assigneeUserId } : {}) },
              });
            }
          }
        } catch { /* routing never blocks ingest */ }
      }

      const existing = m.id ? await prisma.message.findUnique({ where: { waMessageId: m.id } }) : null;
      if (!existing) {
        await prisma.message.create({
          data: {
            conversationId: convo.id,
            waMessageId: m.id ?? null,
            direction: 'inbound',
            type: m.type ?? 'text',
            text,
            source: 'customer',
            // Click-to-WhatsApp attribution, kept verbatim — see referral.ts.
            referral: (referral ?? undefined) as object | undefined,
            at,
          },
        });
        result.messagesStored += 1;
      }

      // Stamp the ad that won this customer. First touch only, and never fatal:
      // losing the stamp must not cost us the message.
      if (referral) {
        const applied = await applyReferralToContact({ tenantId, contactPhone: from, referral, at })
          .catch(() => false);
        if (applied) {
          await notify({
            tenantId,
            category: 'whatsapp',
            kind: 'ctwa_lead',
            severity: 'info',
            title: 'New lead from an ad',
            body: `${nameByWaId[from] || `+${from}`} messaged from ${describeReferral(referral)}.`,
            data: { referral, from },
            dedupeKey: `ctwa:${m.id ?? from}`,
          }).catch(() => { /* the attribution matters more than the notice */ });
        }
      }

      // Consent is decided before automations run: an opt-out must silence the
      // auto-replies in the same breath, not after one more message goes out.
      await applyConsentFromInbound({ tenantId, from, message: m, at })
        .catch((e) => result.errors.push(`Consent: ${e instanceof Error ? e.message : String(e)}`));

      // "First message" means the first LIVE one. An imported thread carrying six
      // months of history is not a new customer, and a welcome automation firing
      // on backfill would be both wrong and embarrassing.
      const inboundCount = await prisma.message.count({
        where: { conversationId: convo.id, direction: 'inbound', isHistorical: false },
      });
      await runInboundAutomations({
        tenantId,
        phoneNumberId,
        from,
        text,
        isFirstMessage: inboundCount <= 1,
        accessToken: account.accessToken ?? null,
      }).catch((e) => result.errors.push(`Automation: ${e instanceof Error ? e.message : String(e)}`));
    } catch (e) {
      result.errors.push(`Message ${m?.id ?? '?'}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

/**
 * Turn an inbound message into a consent decision when it is one.
 *
 * Reads both shapes Meta uses for a tap: `button` for a template quick reply,
 * `interactive.button_reply` for an interactive message. Falls back to keyword
 * matching on the text, where STOP-style words always count and agreement words
 * count only while a request is outstanding.
 *
 * Deliberately silent when the message is ordinary conversation — this runs on
 * every inbound message, so it must never guess.
 */
async function applyConsentFromInbound(input: {
  tenantId: string;
  from: string;
  message: any;
  at: Date;
}): Promise<void> {
  const { tenantId, from, message: m, at } = input;

  const buttonPayload: string | null =
    m?.button?.payload ?? m?.button?.text
    ?? m?.interactive?.button_reply?.id ?? m?.interactive?.button_reply?.title
    ?? null;
  const text: string | null = m?.text?.body ?? null;
  if (!buttonPayload && !text) return;

  const contact = await prisma.crmContact.findFirst({
    where: { tenantId, mobile: { in: [`+${from}`, from] } },
    select: { id: true, mobile: true, consent: true, consentRequestedAt: true, consentWording: true },
  });
  if (!contact) return;

  const stage = consentStage(contact, at);
  const decided = classifyConsentReply({
    text,
    buttonPayload,
    requestPending: stage === 'awaiting_reply',
  });
  if (!decided.decision || !decided.channel) return;

  // An opt-in only lands while we were actually waiting for one, or on an
  // explicit button press. Re-confirming an existing opt-in is a no-op.
  if (decided.decision === 'in') {
    if (contact.consent === 'opted-in') return;
    const freshRequest = contact.consentRequestedAt
      && (at.getTime() - contact.consentRequestedAt.getTime()) / 86_400_000 <= REQUEST_WINDOW_DAYS;
    if (decided.channel !== 'whatsapp_button' && !freshRequest) return;
  } else if (contact.consent === 'opted-out') {
    return;
  }

  await recordConsent({
    tenantId,
    contactId: contact.id,
    mobile: contact.mobile,
    decision: decided.decision,
    channel: decided.channel,
    source: decided.matched ?? undefined,
    wording: contact.consentWording ?? undefined,
    waMessageId: m?.id ?? null,
    at,
  });
}

async function handleStatuses(value: any, result: IngestResult): Promise<void> {
  for (const s of value?.statuses ?? []) {
    result.statusesSeen += 1;
    if (s?.id && s?.status) {
      try {
        await prisma.message.updateMany({ where: { waMessageId: s.id }, data: { status: s.status } });
      } catch (e) {
        result.errors.push(`Status ${s.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
}

// ---- coexistence ----------------------------------------------------------

/**
 * Backfilled WhatsApp Business app history (field: `history`).
 *
 * Chunks can arrive out of order and Meta retries, so this is written to be
 * idempotent and order-independent — see lib/whatsapp/coexistence.ts. Nothing
 * here touches the live inbox: imported threads land in the `imported` state,
 * every message is flagged historical, and no automation, assignment, SLA or
 * notification is triggered by any of it.
 *
 * Progress is tracked on the account so the onboarding screen can show the
 * import filling in. Meta signals completion with phase 2 at 100%.
 */
async function handleHistory(value: any, account: ResolvedAccount, result: IngestResult): Promise<void> {
  const chunks: HistoryChunk[] = value?.history ?? [];
  if (!chunks.length) return;

  let threads = 0, messages = 0, placeholders = 0, declined = false;
  let phase: number | null = null, progress: number | null = null;

  for (const chunk of chunks) {
    const r = await ingestHistoryChunk({
      tenantId: account.tenantId,
      phoneNumberId: value?.metadata?.phone_number_id ?? account.phoneNumberId ?? '',
      businessPhone: value?.metadata?.display_phone_number ?? account.displayPhone ?? '',
      chunk,
    });
    threads += r.threads;
    messages += r.messages;
    placeholders += r.mediaPlaceholders;
    declined = declined || r.declined;
    // Chunks arrive out of order, so keep the furthest point reached, not the last seen.
    if (r.phase !== null) phase = Math.max(phase ?? 0, r.phase);
    if (r.progress !== null) progress = Math.max(progress ?? 0, r.progress);
  }

  if (declined) {
    // Not a failure: the customer chose to keep their chats on the phone.
    await prisma.whatsAppAccount.update({
      where: { id: account.id },
      data: { historyPermission: 'declined', historySyncStatus: 'completed', historyCompletedAt: new Date() },
    });
    result.systemEventsSeen += 1;
    return;
  }

  // Meta marks the end with the final phase at 100%.
  const done = phase === 2 && progress === 100;
  await prisma.whatsAppAccount.update({
    where: { id: account.id },
    data: {
      historyPermission: 'approved',
      historySyncStatus: done ? 'completed' : 'syncing',
      ...(done ? { historyCompletedAt: new Date() } : {}),
      ...(phase !== null ? { historyPhase: phase } : {}),
      ...(progress !== null ? { historyProgress: progress } : {}),
      historyThreads: { increment: threads },
      historyMessages: { increment: messages },
      historyMediaPlaceholders: { increment: placeholders },
    },
  });

  if (done) {
    await notify({
      tenantId: account.tenantId,
      category: 'whatsapp',
      kind: 'history_imported',
      severity: 'info',
      title: 'Previous WhatsApp history imported',
      body: 'Your recent one-to-one conversations are now in the Inbox for context.',
      data: { wabaId: account.wabaId },
      dedupeKey: `history:${account.id}:done`,
    });
  }
  result.systemEventsSeen += 1;
}

/**
 * Messages the owner sent from the WhatsApp Business app (`smb_message_echoes`).
 *
 * Mandatory for a credible coexistence inbox. Without it the CRM sees a
 * customer question with no answer, marks the thread unanswered, and an
 * automation or AI agent cheerfully repeats what the owner already said from
 * their phone five minutes earlier.
 *
 * An echo is real outbound traffic, so unlike history it DOES update the
 * thread's position and clear the unanswered state — but it is not a customer
 * message, so it does not open the 24-hour service window.
 */
async function handleMessageEchoes(value: any, account: ResolvedAccount, result: IngestResult): Promise<void> {
  const { tenantId } = account;
  const phoneNumberId = value?.metadata?.phone_number_id ?? account.phoneNumberId ?? '';

  for (const m of value?.message_echoes ?? []) {
    try {
      const contactPhone = String(m?.to ?? '').replace(/\D/g, '');
      if (!contactPhone) continue;
      const at = m?.timestamp ? new Date(Number(m.timestamp) * 1000) : new Date();
      const text: string = m?.text?.body ?? `[${m?.type ?? 'message'}]`;

      const convo = await prisma.conversation.upsert({
        where: { tenantId_phoneNumberId_contactPhone: { tenantId, phoneNumberId, contactPhone } },
        update: { lastMessageAt: at },
        create: { tenantId, phoneNumberId, contactPhone, lastMessageAt: at },
      });

      if (m?.id) {
        const seen = await prisma.message.findUnique({ where: { waMessageId: m.id } });
        if (seen) continue;
      }
      await prisma.message.create({
        data: {
          conversationId: convo.id,
          waMessageId: m?.id ?? null,
          direction: 'outbound',
          type: m?.type ?? 'text',
          text,
          status: 'sent',
          // The agent needs to know this reply came from someone's phone.
          source: 'whatsapp_business_app',
          at,
        },
      });
      result.messagesStored += 1;
      result.conversationsTouched += 1;
    } catch (e) {
      result.errors.push(`Echo ${m?.id ?? '?'}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

/** The Business app's contact list (`smb_app_state_sync`) — names for the threads. */
async function handleStateSync(value: any, account: ResolvedAccount, result: IngestResult): Promise<void> {
  const entries: StateSyncEntry[] = value?.state_sync ?? [];
  if (!entries.length) return;

  const { added } = await ingestStateSync({ tenantId: account.tenantId, entries });
  await prisma.whatsAppAccount.update({
    where: { id: account.id },
    data: {
      contactsSyncStatus: 'completed',
      contactsSyncedAt: new Date(),
      contactsImported: { increment: added },
    },
  });
  result.systemEventsSeen += 1;
}

// ---- template / account / quality events ----------------------------------

/** Template went approved / rejected / paused / disabled. */
async function handleTemplateStatus(value: any, account: ResolvedAccount, result: IngestResult): Promise<void> {
  const event = String(value?.event ?? '').toUpperCase(); // APPROVED | REJECTED | PAUSED | DISABLED | ...
  const name = value?.message_template_name ?? value?.message_template_id ?? 'a template';
  const lang = value?.message_template_language ? ` (${value.message_template_language})` : '';
  const reason = value?.reason && value.reason !== 'NONE' ? ` — ${value.reason}` : '';

  const severity: NotifySeverity =
    event === 'REJECTED' || event === 'DISABLED' ? 'critical'
      : event === 'PAUSED' || event === 'FLAGGED' || event === 'PENDING_DELETION' ? 'warning'
        : 'info';

  const titleByEvent: Record<string, string> = {
    APPROVED: `Template approved: ${name}`,
    REJECTED: `Template rejected: ${name}`,
    PAUSED: `Template paused: ${name}`,
    DISABLED: `Template disabled: ${name}`,
  };

  // Write the new state into the local mirror first, so the Templates screen is
  // right the moment Meta tells us rather than at the next ten-minute refresh.
  await applyTemplateEvent({
    tenantId: account.tenantId,
    name: value?.message_template_name,
    language: value?.message_template_language,
    status: event || null,
    rejectedReason: value?.reason ?? null,
  }).catch(() => { /* the notification matters more than the mirror */ });

  await notify({
    tenantId: account.tenantId,
    category: 'whatsapp',
    kind: `template_${event.toLowerCase() || 'status'}`,
    severity,
    title: titleByEvent[event] ?? `Template update: ${name}`,
    body: `${name}${lang}${reason}`,
    data: { ...value, wabaId: account.wabaId },
    dedupeKey: `tmpl:${value?.message_template_id ?? name}:${event}`,
  });
  result.systemEventsSeen += 1;
}

/** Meta re-categorised a template — this changes how the template is priced. */
async function handleTemplateCategory(value: any, account: ResolvedAccount, result: IngestResult): Promise<void> {
  const name = value?.message_template_name ?? value?.message_template_id ?? 'a template';
  const prev = value?.previous_category ?? value?.correct_category;
  const next = value?.new_category;
  await applyTemplateEvent({
    tenantId: account.tenantId,
    name: value?.message_template_name,
    language: value?.message_template_language,
    category: next ?? null,
  }).catch(() => {});
  await notify({
    tenantId: account.tenantId,
    category: 'whatsapp',
    kind: 'template_recategorised',
    severity: 'warning',
    title: `Template re-categorised: ${name}`,
    body: `${name} moved${prev ? ` from ${prev}` : ''}${next ? ` to ${next}` : ''}. This can change its pricing.`,
    data: { ...value, wabaId: account.wabaId },
    dedupeKey: `tmplcat:${value?.message_template_id ?? name}:${next ?? ''}`,
  });
  result.systemEventsSeen += 1;
}

/** A template's quality score changed (GREEN / YELLOW / RED). */
async function handleTemplateQuality(value: any, account: ResolvedAccount, result: IngestResult): Promise<void> {
  const name = value?.message_template_name ?? value?.message_template_id ?? 'a template';
  const score = String(value?.new_quality_score ?? '').toUpperCase();
  const severity: NotifySeverity = score === 'RED' ? 'warning' : 'info';
  await applyTemplateEvent({
    tenantId: account.tenantId,
    name: value?.message_template_name,
    language: value?.message_template_language,
    qualityScore: score || null,
  }).catch(() => {});
  await notify({
    tenantId: account.tenantId,
    category: 'whatsapp',
    kind: 'template_quality',
    severity,
    title: `Template quality ${score || 'changed'}: ${name}`,
    body: `${name} quality is now ${score || 'updated'}${value?.previous_quality_score ? ` (was ${value.previous_quality_score})` : ''}.`,
    data: { ...value, wabaId: account.wabaId },
    dedupeKey: `tmplq:${value?.message_template_id ?? name}:${score}`,
  });
  result.systemEventsSeen += 1;
}

/**
 * A template's components changed (header/body/footer/buttons).
 *
 * The payload carries the fact of the change but not reliably the full new
 * component array, and the mirror stores components verbatim — so rather than
 * guess at the shape, this re-syncs from Meta, which is one Graph call and
 * always correct. Best-effort: a failed re-sync just leaves the mirror to catch
 * up on its next staleness refresh.
 */
async function handleTemplateComponents(value: any, account: ResolvedAccount, result: IngestResult): Promise<void> {
  const name = value?.message_template_name ?? value?.message_template_id ?? 'a template';

  if (account.wabaId && account.accessToken) {
    await syncTemplatesFromMeta({
      tenantId: account.tenantId,
      wabaId: account.wabaId,
      accessToken: decrypt(account.accessToken),
    }).catch(() => { /* the staleness refresh will pick it up */ });
  }

  await notify({
    tenantId: account.tenantId,
    category: 'whatsapp',
    kind: 'template_components_changed',
    severity: 'info',
    title: `Template content changed: ${name}`,
    body: `${name} was edited. Campaigns using it now send the updated content.`,
    data: { ...value, wabaId: account.wabaId },
    dedupeKey: `tmplcomp:${value?.message_template_id ?? name}:${value?.message_template_language ?? ''}`,
  });
  result.systemEventsSeen += 1;
}

/** A number's quality rating / messaging limit changed. Writes back onto the account. */
async function handleNumberQuality(value: any, account: ResolvedAccount, result: IngestResult): Promise<void> {
  const event = String(value?.event ?? '').toUpperCase(); // FLAGGED | UPGRADE | DOWNGRADE | ONBOARDING | ...
  const limit = value?.current_limit; // e.g. TIER_1K
  const display = value?.display_phone_number;

  // Map Meta's quality event to our GREEN/YELLOW/RED rating where we can.
  const ratingByEvent: Record<string, string> = { FLAGGED: 'RED', DOWNGRADE: 'YELLOW', UPGRADE: 'GREEN', ONBOARDING: 'GREEN' };
  const rating = ratingByEvent[event];

  // Update the specific number if we can match it by display phone, else the resolved account.
  const data: Record<string, unknown> = { qualitySyncedAt: new Date() };
  if (rating) data.qualityRating = rating;
  if (typeof limit === 'string') data.messagingTier = limit;
  try {
    if (display) {
      const target = await prisma.whatsAppAccount.findFirst({ where: { wabaId: account.wabaId ?? undefined, displayPhone: display }, select: { id: true } });
      if (target) await prisma.whatsAppAccount.update({ where: { id: target.id }, data });
      else await prisma.whatsAppAccount.update({ where: { id: account.id }, data });
    } else {
      await prisma.whatsAppAccount.update({ where: { id: account.id }, data });
    }
  } catch { /* health write-back is best-effort */ }

  const severity: NotifySeverity = event === 'FLAGGED' ? 'critical' : event === 'DOWNGRADE' ? 'warning' : 'info';
  await notify({
    tenantId: account.tenantId,
    category: 'whatsapp',
    kind: 'number_quality',
    severity,
    title: `Number ${event ? event.toLowerCase() : 'quality update'}${display ? `: ${display}` : ''}`,
    body: `${display ?? 'A number'} ${rating ? `quality is now ${rating}` : 'quality changed'}${limit ? `, messaging limit ${limit}` : ''}.`,
    data: { ...value, wabaId: account.wabaId },
    dedupeKey: `numq:${display ?? account.id}:${event}:${limit ?? ''}`,
  });
  result.systemEventsSeen += 1;
}

/** A display-name review completed (approved / rejected). */
async function handleNumberName(value: any, account: ResolvedAccount, result: IngestResult): Promise<void> {
  const decision = String(value?.decision ?? '').toUpperCase(); // APPROVED | REJECTED
  const display = value?.display_phone_number;
  const requested = value?.requested_verified_name;
  await notify({
    tenantId: account.tenantId,
    category: 'whatsapp',
    kind: 'number_name_review',
    severity: decision === 'REJECTED' ? 'warning' : 'info',
    title: `Display name ${decision ? decision.toLowerCase() : 'review'}${display ? `: ${display}` : ''}`,
    body: `${requested ? `"${requested}"` : 'Display name'} ${decision ? decision.toLowerCase() : 'reviewed'}.`,
    data: { ...value, wabaId: account.wabaId },
    dedupeKey: `name:${display ?? account.id}:${decision}`,
  });
  result.systemEventsSeen += 1;
}

/** Account-level event: violation / restriction, ban, or coexistence offboard-reconnect. */
async function handleAccountUpdate(value: any, account: ResolvedAccount, result: IngestResult): Promise<void> {
  const event = String(value?.event ?? '').toUpperCase();

  // Coexistence: Cloud API is suspended while the number re-onboards, then resumes.
  if (event === 'ACCOUNT_OFFBOARDED') {
    try { await prisma.whatsAppAccount.update({ where: { id: account.id }, data: { status: 'reconnect_required', statusReason: 'Coexistence re-onboarding in progress' } }); } catch { /* best-effort */ }
  } else if (event === 'ACCOUNT_RECONNECTED') {
    try { await prisma.whatsAppAccount.update({ where: { id: account.id }, data: { status: 'connected', statusReason: null } }); } catch { /* best-effort */ }
  }

  const critical = ['ACCOUNT_VIOLATION', 'ACCOUNT_RESTRICTION', 'ACCOUNT_DELETED', 'DISABLED_UPDATE', 'ACCOUNT_BANNED'].includes(event);
  const severity: NotifySeverity = critical ? 'critical' : event === 'ACCOUNT_OFFBOARDED' ? 'warning' : 'info';

  const detailBits = [
    value?.violation_info?.violation_type,
    value?.restriction_info?.map?.((r: any) => r?.restriction_type).join(', '),
    value?.ban_info?.waba_ban_state,
    value?.current_limit,
  ].filter(Boolean);

  await notify({
    tenantId: account.tenantId,
    category: 'whatsapp',
    kind: `account_${event.toLowerCase() || 'update'}`,
    severity,
    title: `Account update: ${event ? event.replace(/_/g, ' ').toLowerCase() : 'changed'}`,
    body: detailBits.length ? String(detailBits.join(' · ')) : `Account event ${event || 'received'}.`,
    data: { ...value, wabaId: account.wabaId },
    dedupeKey: `acct:${account.wabaId ?? account.id}:${event}:${JSON.stringify(detailBits)}`,
  });
  result.systemEventsSeen += 1;
}

/** Scaling / eligibility alerts. */
async function handleAccountAlerts(value: any, account: ResolvedAccount, result: IngestResult): Promise<void> {
  const sev = String(value?.alert_severity ?? '').toUpperCase();
  const severity: NotifySeverity = sev === 'CRITICAL' ? 'critical' : sev === 'WARNING' ? 'warning' : 'info';
  await notify({
    tenantId: account.tenantId,
    category: 'whatsapp',
    kind: 'account_alert',
    severity,
    title: `WhatsApp alert: ${value?.alert_type ?? 'notice'}`,
    body: value?.alert_description ?? `Alert ${value?.alert_status ?? ''}`.trim(),
    data: { ...value, wabaId: account.wabaId },
    dedupeKey: `alert:${account.wabaId ?? account.id}:${value?.alert_type ?? ''}:${value?.alert_status ?? ''}`,
  });
  result.systemEventsSeen += 1;
}
