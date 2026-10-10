import { prisma } from '@/lib/db';
import { runInboundAutomations } from '@/lib/crm/automation';
import { routeLocation } from '@/lib/crm/zone-routing';
import { notify, type NotifySeverity } from '@/lib/billing/notify';

/**
 * Routing for a WhatsApp webhook payload.
 *
 * A single POST can carry several `entry` objects, each with several `changes`,
 * and each change has a `field` that says what kind of event it is. We iterate
 * all of them and dispatch by field:
 *
 *   messages                        inbound messages + delivery statuses
 *   message_template_status_update  a template was approved / rejected / paused / disabled
 *   template_category_update        Meta re-categorised a template (changes pricing)
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
          case 'message_template_status_update':
            await handleTemplateStatus(value, account, result); break;
          case 'template_category_update':
            await handleTemplateCategory(value, account, result); break;
          case 'message_template_quality_update':
            await handleTemplateQuality(value, account, result); break;
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

      const convo = await prisma.conversation.upsert({
        where: { tenantId_phoneNumberId_contactPhone: { tenantId, phoneNumberId, contactPhone: from } },
        update: { lastMessageAt: at, contactName: nameByWaId[from] || undefined },
        create: { tenantId, phoneNumberId, contactPhone: from, contactName: nameByWaId[from] || null, lastMessageAt: at },
      });
      result.conversationsTouched += 1;

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
            at,
          },
        });
        result.messagesStored += 1;
      }

      const inboundCount = await prisma.message.count({ where: { conversationId: convo.id, direction: 'inbound' } });
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
