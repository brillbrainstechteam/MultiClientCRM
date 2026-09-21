import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

/**
 * WhatsApp usage aggregation (§1, §2B, §39). Reads MessageBillingRecord — the
 * per-message audit trail — so numbers always reconcile with what was charged.
 */

export interface CategoryUsage {
  category: string;
  delivered: number;
  spend: Prisma.Decimal;
}

export interface UsageSummary {
  from: Date;
  to: Date;
  byCategory: CategoryUsage[];
  totalDelivered: number;
  totalSpend: Prisma.Decimal;
}

const CATEGORIES = ['marketing', 'utility', 'authentication', 'service'];

export function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Usage grouped by category between [from, to). */
export async function usageBetween(tenantId: string, from: Date, to: Date): Promise<UsageSummary> {
  const grouped = await prisma.messageBillingRecord.groupBy({
    by: ['category'],
    where: { tenantId, at: { gte: from, lt: to } },
    _count: { _all: true },
    _sum: { walletDebit: true },
  });

  const map = new Map(grouped.map((g) => [g.category, g]));
  const byCategory: CategoryUsage[] = CATEGORIES.map((category) => {
    const g = map.get(category);
    return {
      category,
      delivered: g?._count._all ?? 0,
      spend: new Prisma.Decimal(g?._sum.walletDebit ?? 0),
    };
  });

  const totalDelivered = byCategory.reduce((n, c) => n + c.delivered, 0);
  const totalSpend = byCategory.reduce((s, c) => s.plus(c.spend), new Prisma.Decimal(0));
  return { from, to, byCategory, totalDelivered, totalSpend };
}

/** Current calendar month usage. */
export function currentMonthUsage(tenantId: string): Promise<UsageSummary> {
  const from = startOfMonth();
  const to = new Date(from.getFullYear(), from.getMonth() + 1, 1);
  return usageBetween(tenantId, from, to);
}
