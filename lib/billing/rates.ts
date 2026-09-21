import { prisma } from '@/lib/db';
import type { MessageRate } from '@prisma/client';

/**
 * Rate-card resolution (§21/§22, Rules 4 & 6).
 *
 * Rates live in the DB (MessageRate), effective-dated, never overwritten. We
 * resolve the rate applicable to a (market, category) AT A GIVEN TIME so a
 * message delivered on Sep-30 keeps the Sep rate even if viewed in December.
 */

// Minimal dial-code → market map. Admin extends markets over time; anything
// unmatched falls back to the DEFAULT rate rows so billing never crashes.
const DIAL_TO_MARKET: ReadonlyArray<readonly [string, string]> = [
  ['91', 'IN'], ['971', 'AE'], ['966', 'SA'], ['65', 'SG'], ['60', 'MY'],
  ['44', 'GB'], ['1', 'US'], ['61', 'AU'], ['49', 'DE'], ['33', 'FR'],
  ['880', 'BD'], ['94', 'LK'], ['977', 'NP'], ['92', 'PK'], ['62', 'ID'],
  ['63', 'PH'], ['66', 'TH'], ['84', 'VN'], ['55', 'BR'], ['27', 'ZA'],
];

/** Map an E.164-ish recipient to a market code (longest dial-prefix wins). */
export function marketFromPhone(phone?: string | null): string {
  if (!phone) return 'DEFAULT';
  const p = phone.replace(/[^0-9]/g, '');
  if (!p) return 'DEFAULT';
  let best: string | null = null;
  let bestLen = 0;
  for (const [dial, market] of DIAL_TO_MARKET) {
    if (p.startsWith(dial) && dial.length > bestLen) {
      best = market;
      bestLen = dial.length;
    }
  }
  return best ?? 'DEFAULT';
}

/** Normalise Meta / CRM category strings to our four billing categories. */
export function normalizeCategory(c?: string | null): string {
  const s = (c ?? '').toLowerCase();
  if (s.includes('market')) return 'marketing';
  if (s.includes('util')) return 'utility';
  if (s.includes('auth')) return 'authentication';
  if (s.includes('service')) return 'service';
  return s || 'utility';
}

/**
 * The rate applicable to (market, category) at `at`. Tries the exact market,
 * then DEFAULT. Returns null only if even DEFAULT is unseeded.
 */
export async function resolveRate(
  market: string,
  category: string,
  at: Date = new Date(),
): Promise<MessageRate | null> {
  const cat = normalizeCategory(category);
  for (const m of market === 'DEFAULT' ? ['DEFAULT'] : [market, 'DEFAULT']) {
    const rate = await prisma.messageRate.findFirst({
      where: {
        market: m,
        category: cat,
        effectiveFrom: { lte: at },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (rate) return rate;
  }
  return null;
}
