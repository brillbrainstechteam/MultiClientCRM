import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import type { Subscription, SubscriptionPlan } from '@prisma/client';

/**
 * Subscription lifecycle (§16, §53). Independent of wallet (Rule 1): an expired
 * subscription must not be rescued by wallet money, and vice-versa.
 */

export type Cycle = 'monthly' | 'quarterly' | 'annual';
export type SubStatus = 'trial' | 'active' | 'payment_due' | 'expired' | 'cancelled';

export function priceForCycle(plan: SubscriptionPlan, cycle: Cycle): Prisma.Decimal {
  if (cycle === 'annual') return new Prisma.Decimal(plan.annualPrice);
  if (cycle === 'quarterly') return new Prisma.Decimal(plan.quarterlyPrice);
  return new Prisma.Decimal(plan.monthlyPrice);
}

export function addCycle(from: Date, cycle: Cycle): Date {
  const d = new Date(from);
  if (cycle === 'annual') d.setFullYear(d.getFullYear() + 1);
  else if (cycle === 'quarterly') d.setMonth(d.getMonth() + 3);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

/**
 * Ensure a tenant has a Subscription row. New tenants get a 14-day trial on the
 * trial plan. Mirrors Tenant.plan for backward compatibility.
 */
export async function getOrCreateSubscription(tenantId: string): Promise<Subscription> {
  const existing = await prisma.subscription.findUnique({ where: { tenantId } });
  if (existing) return existing;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const planCode = tenant?.plan && tenant.plan !== 'trial' ? tenant.plan : 'trial';
  const plan =
    (await prisma.subscriptionPlan.findUnique({ where: { code: planCode } })) ??
    (await prisma.subscriptionPlan.findUnique({ where: { code: 'trial' } }));

  const now = new Date();
  const isTrial = !plan || plan.code === 'trial';
  const renewalAt = isTrial ? new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) : addCycle(now, 'monthly');

  return prisma.subscription.create({
    data: {
      tenantId,
      planId: plan?.id ?? 'trial',
      planCode: plan?.code ?? 'trial',
      cycle: 'monthly',
      status: isTrial ? 'trial' : 'active',
      priceSnapshot: plan ? priceForCycle(plan, 'monthly') : new Prisma.Decimal(0),
      renewalAt,
    },
  });
}

/** Whether paid CRM functionality should be allowed right now (§15/§53). */
export function isSubscriptionActive(sub: Subscription): boolean {
  if (sub.status === 'active' || sub.status === 'trial') {
    // A trial/active past its renewal date with no successful renewal is expired.
    if (sub.renewalAt && sub.renewalAt.getTime() < Date.now()) return false;
    return true;
  }
  if (sub.status === 'payment_due') {
    // In grace window: still allowed. Past grace: blocked.
    return !!sub.graceUntil && sub.graceUntil.getTime() > Date.now();
  }
  return false; // expired | cancelled
}

/** Human status accounting for a lapsed renewal date. */
export function effectiveStatus(sub: Subscription): SubStatus {
  if ((sub.status === 'active' || sub.status === 'trial') && sub.renewalAt && sub.renewalAt.getTime() < Date.now()) {
    return 'expired';
  }
  return sub.status as SubStatus;
}
