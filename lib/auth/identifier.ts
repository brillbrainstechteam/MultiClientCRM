import { normMobile } from '@/lib/crm/mobile';

/**
 * How a login identifier is stored and matched.
 *
 * A user may sign in with their business email or their mobile number. The
 * phone is kept as digits only (E.164 without the '+') so that "+91 98100
 * 11234", "098100 11234" and "9810011234" all resolve to the same row and the
 * unique index cannot be defeated by formatting.
 */

export function looksLikeEmail(identifier: string): boolean {
  return identifier.includes('@');
}

/** Storage/lookup form of a phone identifier, or null when unusable. */
export function phoneKey(raw: string): string | null {
  const e164 = normMobile(raw);
  if (!e164) return null;
  const digits = e164.replace(/\D/g, '');
  return digits.length >= 8 ? digits : null;
}
