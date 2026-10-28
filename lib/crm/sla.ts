import { prisma } from '@/lib/db';
import { notify } from '@/lib/billing/notify';
import { audit } from '@/lib/crm/audit';

/**
 * First-response SLA engine (Lead Intake Hub — First Response SLA + escalation).
 *
 * The SLA is per SOURCE, not one global number: a WhatsApp enquiry or Meta Lead
 * Ad needs near-immediate action, while an exhibition batch or imported calling
 * list follows a scheduled plan (null = no reply clock). `processBreaches` is run
 * by the cron; it flags events whose deadline passed with no first response and
 * escalates — the assignee first, then the managers. It never auto-reassigns a
 * known high-value relationship on one late reply.
 */

// Minutes to first response by source. Overridable per intake call (slaMinutes);
// a full per-tenant config can layer on top later. null = no reply clock.
export const DEFAULT_SLA_MINUTES: Record<string, number | null> = {
  whatsapp: 60, meta_lead_ad: 60, instagram: 60, messenger: 60, website_form: 60,
  website_chat: 30, google_ads: 60, walk_in: 15, ecommerce: 120, qr: 120,
  referral: 240, exhibition: 1440, field_visit: 1440, telecalling: null,
  pos: null, manual: null,
};

export function slaMinutesFor(sourceType: string, override?: number | null): number | null {
  if (override !== undefined) return override;
  return DEFAULT_SLA_MINUTES[sourceType] ?? 60;
}

// Statuses that still owe a first response (so can breach).
const OPEN_FOR_SLA = ['new', 'routed', 'needs_review', 'pending_assignment'];
const MANAGER_ROLES = ['owner', 'admin', 'manager'];

export interface BreachResult { breached: number; escalated: number }

/**
 * Flag newly-breached events and escalate. Scoped to one tenant when given, else
 * all tenants (the cron). Idempotent: an event is escalated once (breachedAt set).
 */
export async function processBreaches(tenantId?: string): Promise<BreachResult> {
  const now = new Date();
  const due = await prisma.crmIntakeEvent.findMany({
    where: {
      ...(tenantId ? { tenantId } : {}),
      slaDueAt: { lte: now },
      firstResponseAt: null,
      breachedAt: null,
      status: { in: OPEN_FOR_SLA },
    },
    select: { id: true, tenantId: true, contactName: true, sourceName: true, sourceType: true, assignedUserId: true, contactId: true },
    take: 500,
  });
  if (due.length === 0) return { breached: 0, escalated: 0 };

  // Managers per tenant (for escalation), fetched once.
  const tenantIds = [...new Set(due.map((e) => e.tenantId))];
  const managersByTenant = new Map<string, string[]>();
  for (const tid of tenantIds) {
    const mgrs = await prisma.user.findMany({ where: { tenantId: tid, status: 'active', role: { in: MANAGER_ROLES } }, select: { id: true } });
    managersByTenant.set(tid, mgrs.map((m) => m.id));
  }

  let escalated = 0;
  for (const e of due) {
    await prisma.crmIntakeEvent.update({ where: { id: e.id }, data: { breachedAt: now } });
    const who = e.contactName ?? 'A lead';
    const via = e.sourceName ?? e.sourceType;

    if (e.assignedUserId) {
      await notify({ tenantId: e.tenantId, userId: e.assignedUserId, category: 'lead', kind: 'sla_breached', severity: 'warning', title: 'First-response SLA missed', body: `${who} (${via}) is past its first-response time.`, data: { intakeEventId: e.id, contactId: e.contactId }, dedupeKey: `sla:${e.id}` });
    }
    // Escalate to managers (skip the assignee to avoid a double ping).
    for (const mid of (managersByTenant.get(e.tenantId) ?? [])) {
      if (mid === e.assignedUserId) continue;
      await notify({ tenantId: e.tenantId, userId: mid, category: 'lead', kind: 'sla_escalation', severity: 'warning', title: 'Lead SLA breached — needs attention', body: `${who} (${via}) missed its first response${e.assignedUserId ? '' : ' and is unassigned'}.`, data: { intakeEventId: e.id, contactId: e.contactId }, dedupeKey: `sla-esc:${e.id}` });
      escalated += 1;
    }
    await audit({ tenantId: e.tenantId, actorId: null, action: 'intake.sla_breached', targetType: 'intake_event', targetId: e.id, detail: `${via}: first-response SLA missed` });
  }

  return { breached: due.length, escalated };
}
