import { prisma } from '@/lib/db';

/**
 * Plan limits, enforced.
 *
 * Every plan already declared users, numbers, contacts, campaigns, messages,
 * storage, calling and ai — but only `users` was ever checked, so the rest were
 * marketing copy on the Billing page. This is the one place that answers "may
 * this tenant do one more of X?", so the rules cannot drift between the eight
 * call sites that ask.
 *
 * Two shapes of limit, and the difference matters:
 *
 *  - **Stock** (users, numbers, contacts, storage): how many may exist at once.
 *    Deleting one frees it.
 *  - **Flow** (campaigns, messages): how many per billing month. These reset,
 *    so the count is taken from the start of the current period rather than
 *    all time — otherwise a tenant would hit a wall in month three and never
 *    recover.
 *
 * Booleans (calling, ai) are feature gates, not counters.
 *
 * Overage: a plan with a `seatOveragePrice` allows going past the seat count as
 * billable overage rather than blocking. That applies to seats only — no other
 * resource has an agreed overage price, so the rest are hard caps.
 */

export type LimitKey =
  | 'users' | 'numbers' | 'contacts' | 'campaigns' | 'messages' | 'storageGb';
export type FeatureKey = 'calling' | 'ai';

export interface PlanLimits {
  planCode: string;
  planName: string;
  users: number | null;
  numbers: number | null;
  contacts: number | null;
  campaigns: number | null;
  messages: number | null;
  storageGb: number | null;
  calling: boolean;
  ai: boolean;
  seatOveragePrice: number;
  currency: string;
}

/** A null limit means unlimited — never zero. */
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export async function getPlanLimits(tenantId: string): Promise<PlanLimits> {
  const sub = await prisma.subscription.findUnique({ where: { tenantId } });
  const code = sub?.planCode
    ?? (await prisma.tenant.findUnique({ where: { id: tenantId } }))?.plan
    ?? 'trial';
  const plan = await prisma.subscriptionPlan.findUnique({ where: { code } });
  const l = (plan?.limits ?? {}) as Record<string, unknown>;

  return {
    planCode: code,
    planName: plan?.name ?? code,
    users: num(l.users),
    numbers: num(l.numbers),
    contacts: num(l.contacts),
    campaigns: num(l.campaigns),
    messages: num(l.messages),
    storageGb: num(l.storageGb),
    calling: l.calling === true,
    ai: l.ai === true,
    seatOveragePrice: num(l.seatOveragePrice) ?? 0,
    currency: plan?.currency ?? 'INR',
  };
}

/** Start of the current billing month — where the flow limits count from. */
export function periodStart(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/** What the tenant has used against each limit right now. */
export async function getUsage(tenantId: string): Promise<Record<LimitKey, number>> {
  const since = periodStart();
  const [users, numbers, contacts, campaigns, messages, storageBytes] = await Promise.all([
    prisma.user.count({ where: { tenantId, status: 'active' } }),
    prisma.whatsAppAccount.count({ where: { tenantId, status: { not: 'disconnected' } } }),
    prisma.crmContact.count({ where: { tenantId } }),
    prisma.crmCampaign.count({ where: { tenantId, createdAt: { gte: since } } }),
    // Business-initiated sends are what a plan's message allowance pays for;
    // inbound and backfill are not billable traffic.
    prisma.message.count({
      where: {
        conversation: { tenantId },
        direction: 'outbound',
        isHistorical: false,
        at: { gte: since },
      },
    }),
    prisma.crmFile.aggregate({ where: { tenantId }, _sum: { size: true } }),
  ]);

  return {
    users,
    numbers,
    contacts,
    campaigns,
    messages,
    // Rounded up: a tenant 1 byte over 5GB is over 5GB.
    storageGb: Math.ceil(((storageBytes._sum.size ?? 0) / 1_073_741_824) * 100) / 100,
  };
}

export interface LimitCheck {
  allowed: boolean;
  limit: number | null;
  used: number;
  /** Operator-facing explanation, already mentioning the plan. */
  reason?: string;
}

const LABEL: Record<LimitKey, { one: string; many: string; period?: boolean }> = {
  users: { one: 'team seat', many: 'team seats' },
  numbers: { one: 'WhatsApp number', many: 'WhatsApp numbers' },
  contacts: { one: 'contact', many: 'contacts' },
  campaigns: { one: 'campaign', many: 'campaigns', period: true },
  messages: { one: 'message', many: 'messages', period: true },
  storageGb: { one: 'GB of storage', many: 'GB of storage' },
};

/**
 * May this tenant add `adding` more of `key`?
 *
 * `adding` matters for bulk work: an import of 5,000 contacts against 300 of
 * headroom must be refused before it starts, not after 300 rows.
 */
export async function checkLimit(
  tenantId: string,
  key: LimitKey,
  adding = 1,
): Promise<LimitCheck> {
  const [limits, usage] = await Promise.all([getPlanLimits(tenantId), getUsage(tenantId)]);
  const limit = limits[key];
  const used = usage[key];
  if (limit === null) return { allowed: true, limit: null, used };

  // Seats are the one resource with an agreed overage price.
  if (key === 'users' && limits.seatOveragePrice > 0) {
    return { allowed: true, limit, used };
  }

  if (used + adding <= limit) return { allowed: true, limit, used };

  const label = LABEL[key];
  const noun = limit === 1 ? label.one : label.many;
  const window = label.period ? ' this month' : '';
  const remaining = Math.max(0, limit - used);
  const reason = adding > 1
    ? `Your ${limits.planName} plan includes ${limit.toLocaleString('en-IN')} ${noun}${window} and ${remaining.toLocaleString('en-IN')} remain — this would add ${adding.toLocaleString('en-IN')}. Upgrade your plan to continue.`
    : `Your ${limits.planName} plan includes ${limit.toLocaleString('en-IN')} ${noun}${window}, and all are in use. Upgrade your plan to add more.`;
  return { allowed: false, limit, used, reason };
}

/** Is this feature part of the tenant's plan? */
export async function checkFeature(
  tenantId: string,
  key: FeatureKey,
): Promise<{ allowed: boolean; reason?: string }> {
  const limits = await getPlanLimits(tenantId);
  if (limits[key]) return { allowed: true };
  const name = key === 'calling' ? 'Calling & visits' : 'AI agents';
  return {
    allowed: false,
    reason: `${name} is not included in your ${limits.planName} plan. Upgrade to use it.`,
  };
}

/** Storage is checked in bytes at the point of upload. */
export async function checkStorage(
  tenantId: string,
  addingBytes: number,
): Promise<LimitCheck> {
  const [limits, usage] = await Promise.all([getPlanLimits(tenantId), getUsage(tenantId)]);
  if (limits.storageGb === null) return { allowed: true, limit: null, used: usage.storageGb };
  const addingGb = addingBytes / 1_073_741_824;
  if (usage.storageGb + addingGb <= limits.storageGb) {
    return { allowed: true, limit: limits.storageGb, used: usage.storageGb };
  }
  return {
    allowed: false,
    limit: limits.storageGb,
    used: usage.storageGb,
    reason: `Your ${limits.planName} plan includes ${limits.storageGb}GB of storage and ${usage.storageGb}GB is in use. Upgrade your plan or remove some files.`,
  };
}

/** The whole picture, for the Billing page and the usage meters. */
export async function getPlanUsageSummary(tenantId: string) {
  const [limits, usage] = await Promise.all([getPlanLimits(tenantId), getUsage(tenantId)]);
  const keys: LimitKey[] = ['users', 'numbers', 'contacts', 'campaigns', 'messages', 'storageGb'];
  return {
    plan: { code: limits.planCode, name: limits.planName },
    features: { calling: limits.calling, ai: limits.ai },
    periodStart: periodStart().toISOString(),
    limits: keys.map((key) => ({
      key,
      label: LABEL[key].many,
      perMonth: !!LABEL[key].period,
      used: usage[key],
      limit: limits[key],
      // Null limit renders as "unlimited" rather than a full bar.
      percent: limits[key] ? Math.min(100, Math.round((usage[key] / limits[key]!) * 100)) : null,
    })),
    seatOveragePrice: limits.seatOveragePrice,
    currency: limits.currency,
  };
}
