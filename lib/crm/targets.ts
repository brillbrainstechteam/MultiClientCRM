/**
 * Gram targets (PRD §19, TEAM-05, TGT-01..07).
 *
 * Jewellery sales are measured in grams, not rupees, and there was no target of
 * any kind in the system before this. Pure arithmetic and period handling —
 * the reads live in the API route.
 */

/**
 * The month a financial year starts in, 1-based. April in India.
 *
 * §26 leaves this tenant-configurable, so it is a parameter everywhere rather
 * than a constant anybody can reach for.
 */
export const DEFAULT_FY_START_MONTH = 4;

/**
 * The label a business would use for the year containing `date`, e.g. "2026-27".
 *
 * A label rather than a date pair because that is what people say out loud, and
 * because a stored pair of dates would need migrating the day a tenant moves
 * its year start.
 */
export function periodLabel(date: Date, fyStartMonth: number = DEFAULT_FY_START_MONTH): string {
  const month = date.getMonth() + 1;
  const startYear = month >= fyStartMonth ? date.getFullYear() : date.getFullYear() - 1;
  // A year that starts in January is just a calendar year, and nobody calls
  // 2026 "2026-27". Spanning labels are only meaningful when the period
  // actually straddles two years.
  if (fyStartMonth === 1) return String(startYear);
  const endShort = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}-${endShort}`;
}

/** The half-open date range a period label covers: [start, end). */
export function periodRange(
  label: string,
  fyStartMonth: number = DEFAULT_FY_START_MONTH,
): { start: Date; end: Date } | null {
  // Either a spanning label ("2026-27") or a bare calendar year ("2026").
  const m = /^(\d{4})(?:-(\d{2}))?$/.exec(label.trim());
  if (!m) return null;
  const startYear = Number(m[1]);
  const start = new Date(startYear, fyStartMonth - 1, 1, 0, 0, 0, 0);
  const end = new Date(startYear + 1, fyStartMonth - 1, 1, 0, 0, 0, 0);
  return { start, end };
}

export interface Attainment {
  targetGrams: number;
  achievedGrams: number;
  remainingGrams: number;
  /** Whole percent. 0 when there is no target, never Infinity. */
  percent: number;
  /** True once the target is met — the thing the UI actually celebrates. */
  met: boolean;
}

/**
 * Progress against a target.
 *
 * Guards the two cases that produce nonsense on a dashboard: a target of zero,
 * which would divide to Infinity, and overachievement, which must not report
 * negative grams remaining.
 */
export function attainment(targetGrams: number, achievedGrams: number): Attainment {
  const target = Number.isFinite(targetGrams) && targetGrams > 0 ? targetGrams : 0;
  const achieved = Number.isFinite(achievedGrams) && achievedGrams > 0 ? achievedGrams : 0;
  return {
    targetGrams: target,
    achievedGrams: achieved,
    remainingGrams: Math.max(0, target - achieved),
    percent: target === 0 ? 0 : Math.round((achieved / target) * 100),
    met: target > 0 && achieved >= target,
  };
}

/** Sum the grams on an order's lines. */
export function orderGrams(items: Array<{ grams?: number | null; quantity?: number | null }>): number {
  return items.reduce((sum, it) => {
    const g = Number(it.grams);
    if (!Number.isFinite(g) || g <= 0) return sum;
    // Grams are recorded per line, already for the whole line rather than per
    // unit — a jeweller writes "two bangles, 48g", not "24g each".
    return sum + g;
  }, 0);
}

/**
 * Which order statuses count toward a target.
 *
 * An enquiry or a quotation is not a sale, and counting one would let an agent
 * hit a yearly target by raising quotations nobody accepted. Cancelled and
 * returned orders are removed again for the same reason.
 */
export const TARGET_COUNTING_STATUSES = new Set([
  'confirmed', 'payment_pending', 'part_paid', 'paid',
  'processing', 'ready_dispatch', 'shipped', 'delivered',
]);

export function countsTowardTarget(order: {
  status: string;
  countsTowardTarget?: boolean | null;
}): boolean {
  if (order.countsTowardTarget === false) return false;
  return TARGET_COUNTING_STATUSES.has(order.status);
}

/** "1,250 g" / "1.25 kg" — grams get large in this trade. */
export function formatGrams(grams: number): string {
  if (!Number.isFinite(grams)) return '0 g';
  if (Math.abs(grams) >= 1000) {
    return `${(grams / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg`;
  }
  return `${grams.toLocaleString('en-IN', { maximumFractionDigits: 2 })} g`;
}
