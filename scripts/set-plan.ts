/**
 * Move a tenant onto a plan.
 *
 * Usage: npx tsx scripts/set-plan.ts <tenant-name-fragment> <planCode> [--apply]
 *
 * Writes the Subscription the seat check reads (lib + /api/crm/team/members),
 * so the effect is immediate: included seats, overage price, and the feature
 * flags the plan carries.
 */
import { prisma } from '../lib/db';

const [fragment, planCode] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const APPLY = process.argv.includes('--apply');

(async () => {
  if (!fragment || !planCode) {
    console.error('usage: set-plan.ts <tenant-name-fragment> <planCode> [--apply]');
    process.exit(1);
  }
  const tenant = await prisma.tenant.findFirst({
    where: { businessName: { contains: fragment, mode: 'insensitive' } },
    select: { id: true, businessName: true, plan: true },
  });
  if (!tenant) { console.error(`No tenant matching "${fragment}".`); process.exit(1); }

  const plan = await prisma.subscriptionPlan.findUnique({ where: { code: planCode } });
  if (!plan) { console.error(`No plan "${planCode}".`); process.exit(1); }

  const limits = (plan.limits ?? {}) as Record<string, unknown>;
  const activeSeats = await prisma.user.count({ where: { tenantId: tenant.id, status: 'active' } });

  console.log(`${APPLY ? 'Moving' : 'Would move'} "${tenant.businessName}" from ${tenant.plan} to ${plan.code}`);
  console.log(`  seats: ${activeSeats} active / ${limits.users} included (overage ₹${limits.seatOveragePrice}/seat)`);
  console.log(`  numbers ${limits.numbers} · contacts ${limits.contacts} · campaigns ${limits.campaigns} · calling ${limits.calling} · ai ${limits.ai}`);

  if (!APPLY) { console.log('\nRe-run with --apply to write it.'); await prisma.$disconnect(); return; }

  const renewalAt = new Date(Date.now() + 365 * 86_400_000);
  await prisma.$transaction([
    prisma.subscription.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id, planId: plan.id, planCode: plan.code, cycle: 'annual',
        status: 'active', priceSnapshot: plan.annualPrice, currency: plan.currency, renewalAt,
      },
      update: {
        planId: plan.id, planCode: plan.code, cycle: 'annual', status: 'active',
        priceSnapshot: plan.annualPrice, currency: plan.currency, renewalAt,
        cancelledAt: null, graceUntil: null,
      },
    }),
    // Tenant.plan is the fallback the seat check uses when no Subscription row
    // exists, so keep the two in step rather than leaving a stale 'trial' here.
    prisma.tenant.update({ where: { id: tenant.id }, data: { plan: plan.code } }),
  ]);
  console.log('\nDone.');
  await prisma.$disconnect();
})();
