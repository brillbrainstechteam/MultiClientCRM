/**
 * Mobile-number normalisation, shared by the server importer and the import
 * wizard's client-side validation so both agree on what a usable number is.
 * Pure — no database, no framework.
 */

/**
 * Excel turns a long number into scientific notation ("9.81001E+09") and keeps
 * only ~6 significant digits, so the real number is NOT recoverable. Importing
 * the rounded value would message a stranger, so we detect and reject instead.
 */
export function isScientificNotation(raw: string): boolean {
  return /^[+-]?\d(?:\.\d+)?\s*[eE]\s*[+-]?\d+$/.test(String(raw ?? '').trim());
}

/**
 * Normalise to E.164, assuming +91 when no country code is present.
 * Returns '' when the value cannot be trusted as a phone number — the caller
 * skips those rows rather than storing something wrong.
 */
export function normMobile(m: unknown): string {
  let t = String(m ?? '').trim();
  if (!t) return '';

  // Unrecoverable — see isScientificNotation.
  if (isScientificNotation(t)) return '';

  const hadPlus = t.startsWith('+');
  // Spreadsheets often hand back "9810011234.0" for a numeric cell.
  t = t.replace(/\.0+$/, '');

  let digits = t.replace(/\D/g, '');
  if (!digits) return '';

  // An explicit country code is trusted as given (minus the formatting).
  if (hadPlus) return digits.length >= 8 ? `+${digits}` : '';

  // "0 98100 11234" — a domestic trunk prefix, not part of the number.
  digits = digits.replace(/^0+/, '');

  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  // Longer than an Indian number with its code: assume it carries its own.
  if (digits.length > 12) return `+${digits}`;
  // 11 digits, no recognisable prefix: keep the last 10 as the subscriber number.
  if (digits.length === 11) return `+91${digits.slice(-10)}`;
  // Too short to dial.
  return '';
}
