/**
 * Plan limit tests against a throwaway tenant.
 *
 * Run: npx tsx scripts/test-plan-limits.ts
 *
 * Only `users` was ever enforced, so these pin the rules for the other six down
 * before they drift: which limits reset monthly and which count stock, that
 * bulk work is refused up front rather than part-way, that backfilled messages
 * are not billable sends, and that seats remain the one resource allowed to
 * exceed its cap as billable overage.
 */
import { prisma } from '../lib/db';
import {
  checkLimit, checkFeature, checkStorage, getPlanLimits, getUsage, periodStart,
} from '../lib/billing/limits';

let pass = 0;
const failures: string[] = [];

function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; return; }
  failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

const suffix = `pl${Date.now()}`;
const tenantId = `t_${suffix}`;

async function setPlan(code: string) {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { code } });
  if (!plan) throw new Error(`plan ${code} is not seeded`);
  await prisma.subscription.upsert({
    where: { tenantId },
    create: { tenantId, planId: plan.id, planCode: code, status: 'active', priceSnapshot: plan.monthlyPrice },
    update: { planId: plan.id, planCode: code, status: 'active' },
  });
}

async function cleanup() {
  const steps = [
    () => prisma.message.deleteMany({ where: { conversation: { tenantId } } }),
    () => prisma.conversation.deleteMany({ where: { tenantId } }),
    () => prisma.crmCampaign.deleteMany({ where: { tenantId } }),
    () => prisma.crmContact.deleteMany({ where: { tenantId } }),
    () => prisma.user.deleteMany({ where: { tenantId } }),
    () => prisma.subscription.deleteMany({ where: { tenantId } }),
    () => prisma.tenant.delete({ where: { id: tenantId } }),
  ];
  for (const step of steps) await step().catch(() => {});
}

async function main() {
  await prisma.tenant.create({ data: { id: tenantId, businessName: 'Plan Limit Test', plan: 'trial' } });
  await setPlan('trial');

  /* ---- Limits resolve from the plan -------------------------------------- */

  const trial = await getPlanLimits(tenantId);
  check('trial seats', trial.users, 2);
  check('trial numbers', trial.numbers, 1);
  check('trial contacts', trial.contacts, 500);
  check('trial has no calling', trial.calling, false);
  check('trial has no ai', trial.ai, false);

  /* ---- Feature gates ------------------------------------------------------ */

  check('calling blocked on trial', (await checkFeature(tenantId, 'calling')).allowed, false);
  check('ai blocked on trial', (await checkFeature(tenantId, 'ai')).allowed, false);
  check('and the refusal names the plan',
    ((await checkFeature(tenantId, 'ai')).reason ?? '').includes('Trial'), true);

  await setPlan('starter');
  check('starter includes calling', (await checkFeature(tenantId, 'calling')).allowed, true);
  check('but starter has no ai', (await checkFeature(tenantId, 'ai')).allowed, false);

  await setPlan('growth');
  check('growth includes both', (await checkFeature(tenantId, 'ai')).allowed, true);

  /* ---- Stock limits: contacts --------------------------------------------- */

  await setPlan('trial');
  await prisma.crmContact.create({
    data: {
      id: `c1_${suffix}`, tenantId, name: 'C1', mobile: `+9199${suffix.slice(-8)}`,
      city: 'Jaipur', ownerId: 'u', stage: 'new', tags: [], source: 'test', consent: 'pending',
      salesTier: 'standard', branchId: 'b', primaryWhatsAppNumberId: 'n', productInterests: [],
    },
  });
  check('one contact used', (await getUsage(tenantId)).contacts, 1);
  check('well under the cap, so allowed', (await checkLimit(tenantId, 'contacts')).allowed, true);
  check('an import that exactly fills the cap is allowed',
    (await checkLimit(tenantId, 'contacts', 499)).allowed, true);
  check('one more than fits is refused',
    (await checkLimit(tenantId, 'contacts', 500)).allowed, false);
  check('a bulk import well past the cap is refused up front',
    (await checkLimit(tenantId, 'contacts', 600)).allowed, false);
  check('and the refusal names the plan',
    ((await checkLimit(tenantId, 'contacts', 600)).reason ?? '').includes('Trial'), true);

  /* ---- Seats: the one resource with overage ------------------------------- */

  await prisma.user.create({
    data: { tenantId, name: 'A', email: `a.${suffix}@plan.invalid`, passwordHash: 'x', role: 'owner', status: 'active' },
  });
  await prisma.user.create({
    data: { tenantId, name: 'B', email: `b.${suffix}@plan.invalid`, passwordHash: 'x', role: 'agent', status: 'active' },
  });

  await setPlan('trial');
  check('trial blocks a third seat, having no overage price',
    (await checkLimit(tenantId, 'users')).allowed, false);
  await setPlan('starter');
  check('starter allows it as billable overage',
    (await checkLimit(tenantId, 'users')).allowed, true);

  await prisma.user.updateMany({ where: { tenantId, role: 'agent' }, data: { status: 'disabled' } });
  check('a disabled member stops consuming a seat', (await getUsage(tenantId)).users, 1);
  await prisma.user.updateMany({ where: { tenantId, role: 'agent' }, data: { status: 'active' } });

  /* ---- Flow limits reset each billing month ------------------------------- */

  await setPlan('trial');
  await prisma.crmCampaign.create({ data: { tenantId, name: 'This month' } });
  const old = await prisma.crmCampaign.create({ data: { tenantId, name: 'Last month' } });
  await prisma.crmCampaign.update({
    where: { id: old.id },
    data: { createdAt: new Date(periodStart().getTime() - 5 * 86_400_000) },
  });

  check('last month does not count against this month',
    (await getUsage(tenantId)).campaigns, 1);
  check('a second campaign still fits the trial allowance of 2',
    (await checkLimit(tenantId, 'campaigns')).allowed, true);
  await prisma.crmCampaign.create({ data: { tenantId, name: 'Second' } });
  check('a third does not', (await checkLimit(tenantId, 'campaigns')).allowed, false);
  check('and the message says the allowance is monthly',
    ((await checkLimit(tenantId, 'campaigns')).reason ?? '').includes('this month'), true);

  /* ---- Messages: live outbound only --------------------------------------- */

  const convo = await prisma.conversation.create({
    data: { tenantId, phoneNumberId: `pn_${suffix}`, contactPhone: '919900000000' },
  });
  await prisma.message.create({ data: { conversationId: convo.id, direction: 'outbound', text: 'live' } });
  await prisma.message.create({ data: { conversationId: convo.id, direction: 'inbound', text: 'from the customer' } });
  await prisma.message.create({
    data: {
      conversationId: convo.id, direction: 'outbound', text: 'backfill',
      isHistorical: true, source: 'history_import',
    },
  });
  // Inbound is not billable, and imported history was never sent by us.
  check('only live outbound counts as a billable send', (await getUsage(tenantId)).messages, 1);

  /* ---- Storage ------------------------------------------------------------ */

  const GB = 1_073_741_824;
  check('a small upload fits the trial 1GB', (await checkStorage(tenantId, 1024)).allowed, true);
  check('a 2GB upload does not', (await checkStorage(tenantId, 2 * GB)).allowed, false);
  await setPlan('advanced');
  check('but it fits on advanced (100GB)', (await checkStorage(tenantId, 2 * GB)).allowed, true);

  /* ---- Advanced still has caps -------------------------------------------- */

  const adv = await getPlanLimits(tenantId);
  check('advanced seats', adv.users, 50);
  check('advanced overage price', adv.seatOveragePrice, 199);
  check('advanced numbers', adv.numbers, 20);

  await cleanup();

  if (failures.length) {
    console.error(`\n${failures.length} FAILED of ${pass + failures.length}:\n`);
    for (const f of failures) console.error(`  x ${f}\n`);
    process.exit(1);
  }
  console.log(`All ${pass} plan-limit checks passed.`);
}

main()
  .catch(async (e) => {
    console.error(e);
    await cleanup();
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
