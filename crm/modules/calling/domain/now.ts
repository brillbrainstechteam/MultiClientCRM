/**
 * Fixed "now" for the Calling prototype so overdue/due-today/upcoming
 * fixtures and Figma captures stay deterministic across sessions.
 */
export const REFERENCE_NOW = '2026-08-11T09:30:00+05:30';

export function referenceNow(): Date {
  return new Date(REFERENCE_NOW);
}
