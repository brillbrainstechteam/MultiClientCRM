/**
 * Billing seed — subscription plans + WhatsApp message rate card.
 *
 * These are values the ADMIN portal will manage later (§18 Plans, §21 Pricing).
 * They are SEEDED IN THE DB (not hard-coded in app logic — Rules 4 & 5), so the
 * customer-facing billing works today and Admin only needs a management UI.
 *
 * Rates are the per-message model (post Jul-2025). customerRate = metaRate +
 * markup (TalkTrack's margin). India seeded precisely; DEFAULT is a fallback so
 * other markets never break billing until Admin adds them.
 *
 * Idempotent: fixed ids + upserts, safe to re-run.  Run: npx tsx prisma/seed-billing.ts
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const D = (n: number) => new Prisma.Decimal(n);
// All seeded rates share one effective date; new rates later close this one.
const EFFECTIVE_FROM = new Date('2025-07-01T00:00:00.000Z');

const PLANS = [
  {
    code: 'trial', name: 'Trial', sortOrder: 0,
    monthlyPrice: 0, quarterlyPrice: 0, annualPrice: 0,
    features: [
      { key: 'inbox', label: 'Shared inbox', included: true },
      { key: 'contacts', label: 'Contacts & leads', included: true },
      { key: 'campaigns', label: 'Campaigns', included: true },
      { key: 'automations', label: 'Automations', included: false },
      { key: 'ai', label: 'AI agents', included: false },
    ],
    limits: { users: 2, numbers: 1, contacts: 500, campaigns: 2, messages: 1000, storageGb: 1, calling: false, ai: false },
  },
  {
    code: 'starter', name: 'Starter', sortOrder: 1,
    monthlyPrice: 999, quarterlyPrice: 2699, annualPrice: 9990,
    features: [
      { key: 'inbox', label: 'Shared inbox', included: true },
      { key: 'contacts', label: 'Contacts & leads', included: true },
      { key: 'campaigns', label: 'Campaigns', included: true },
      { key: 'automations', label: 'Automations', included: true },
      { key: 'ai', label: 'AI agents', included: false },
    ],
    limits: { users: 5, numbers: 2, contacts: 5000, campaigns: 20, messages: 25000, storageGb: 5, calling: true, ai: false },
  },
  {
    code: 'growth', name: 'Growth', sortOrder: 2,
    monthlyPrice: 2499, quarterlyPrice: 6749, annualPrice: 24990,
    features: [
      { key: 'inbox', label: 'Shared inbox', included: true },
      { key: 'contacts', label: 'Contacts & leads', included: true },
      { key: 'campaigns', label: 'Campaigns', included: true },
      { key: 'automations', label: 'Automations', included: true },
      { key: 'ai', label: 'AI agents', included: true },
    ],
    limits: { users: 15, numbers: 5, contacts: 50000, campaigns: 100, messages: 200000, storageGb: 25, calling: true, ai: true },
  },
  {
    code: 'advanced', name: 'Advanced', sortOrder: 3,
    monthlyPrice: 5999, quarterlyPrice: 16199, annualPrice: 59990,
    features: [
      { key: 'inbox', label: 'Shared inbox', included: true },
      { key: 'contacts', label: 'Contacts & leads', included: true },
      { key: 'campaigns', label: 'Campaigns', included: true },
      { key: 'automations', label: 'Automations', included: true },
      { key: 'ai', label: 'AI agents', included: true },
    ],
    limits: { users: 50, numbers: 20, contacts: 500000, campaigns: 1000, messages: 2000000, storageGb: 100, calling: true, ai: true },
  },
];

// [market, category, metaRate, markup]  -> customerRate = metaRate + markup
const RATES: [string, string, number, number][] = [
  // India (per-message, INR) — approximate Meta rates; Admin adjusts later.
  ['IN', 'marketing', 0.7846, 0.15],
  ['IN', 'utility', 0.1146, 0.05],
  ['IN', 'authentication', 0.1128, 0.05],
  ['IN', 'service', 0, 0],
  // DEFAULT fallback for markets not yet configured.
  ['DEFAULT', 'marketing', 0.9, 0.2],
  ['DEFAULT', 'utility', 0.15, 0.05],
  ['DEFAULT', 'authentication', 0.15, 0.05],
  ['DEFAULT', 'service', 0, 0],
];

async function main() {
  for (const p of PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { code: p.code },
      update: {
        name: p.name, sortOrder: p.sortOrder, active: true,
        monthlyPrice: D(p.monthlyPrice), quarterlyPrice: D(p.quarterlyPrice), annualPrice: D(p.annualPrice),
        features: p.features, limits: p.limits,
      },
      create: {
        code: p.code, name: p.name, sortOrder: p.sortOrder,
        monthlyPrice: D(p.monthlyPrice), quarterlyPrice: D(p.quarterlyPrice), annualPrice: D(p.annualPrice),
        features: p.features, limits: p.limits,
      },
    });
  }
  console.log(`Seeded ${PLANS.length} plans`);

  for (const [market, category, meta, markup] of RATES) {
    const id = `rate_${market}_${category}_v1`;
    await prisma.messageRate.upsert({
      where: { id },
      update: { metaRate: D(meta), markup: D(markup), customerRate: D(meta + markup), effectiveFrom: EFFECTIVE_FROM, effectiveTo: null },
      create: { id, market, category, metaRate: D(meta), markup: D(markup), customerRate: D(meta + markup), effectiveFrom: EFFECTIVE_FROM },
    });
  }
  console.log(`Seeded ${RATES.length} message rates`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
