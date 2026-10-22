/**
 * Field visits and exhibition journeys (PRD §15, §16, §21.5, §21.6).
 *
 * Pure functions over rows the caller has read — the visit lifecycle, the
 * report arithmetic, and the exhibition journey. No database here, so the
 * rules can be tested without one.
 *
 * The thing worth being careful about is what "pending" and "missed" mean. A
 * visit planned for next Tuesday is pending; one planned for last Tuesday that
 * nobody logged is missed. Collapsing the two is how a field team ends up with
 * a backlog nobody can see.
 */

export type VisitStatus = 'planned' | 'visited' | 'cancelled' | 'missed';

export const VISIT_OUTCOMES = [
  { value: 'interested', label: 'Interested' },
  { value: 'converted', label: 'Converted — bought' },
  { value: 'follow_up', label: 'Needs a follow-up' },
  { value: 'not_interested', label: 'Not interested' },
  { value: 'no_meeting', label: 'Could not meet' },
] as const;

export const VISIT_OUTCOME_VALUES = new Set(VISIT_OUTCOMES.map((o) => o.value));

export interface VisitRow {
  status: string;
  plannedAt: Date;
  visitedAt: Date | null;
  outcome: string | null;
  expenseAmount: number | null;
  expectedGrams: number | null;
  actualGrams: number | null;
  contactId: string;
  assigneeUserId: string | null;
}

/**
 * What a planned visit actually is, given the clock.
 *
 * Stored status wins once somebody has acted on it. Only a still-'planned'
 * visit whose date has passed is reinterpreted — and it is reinterpreted
 * rather than written, so a visit logged late simply becomes 'visited' and
 * stops being counted as missed, with no repair job to run.
 */
export function effectiveStatus(v: Pick<VisitRow, 'status' | 'plannedAt'>, now: Date = new Date()): VisitStatus {
  if (v.status === 'visited' || v.status === 'cancelled') return v.status;
  if (v.status === 'missed') return 'missed';
  // A visit is only overdue once its whole day has passed — a visit planned
  // for today at an unknown hour is not missed at 9am.
  const endOfPlannedDay = new Date(v.plannedAt);
  endOfPlannedDay.setHours(23, 59, 59, 999);
  return now.getTime() > endOfPlannedDay.getTime() ? 'missed' : 'planned';
}

export interface VisitReport {
  planned: number;
  visited: number;
  cancelled: number;
  /** Planned, still ahead of us. */
  pending: number;
  /** Planned, the day has passed, nothing logged. */
  missed: number;
  totalExpense: number;
  /** Distinct customers with an 'interested' outcome. */
  interested: number;
  /** Distinct customers with a 'converted' outcome. */
  converted: number;
  /** Grams actually bought across visited calls. */
  volumeGrams: number;
  expectedGrams: number;
  /** Visited ÷ planned, as a whole percent. 0 when nothing was planned. */
  completionPercent: number;
}

/**
 * The §21.5 / FLD-05 / FLD-07 report over a set of visits.
 *
 * Customers are counted distinctly rather than per visit: three visits to one
 * jeweller who bought is one converted customer, and reporting three would
 * make the field team look three times as effective as it was.
 */
export function summariseVisits(visits: VisitRow[], now: Date = new Date()): VisitReport {
  const interested = new Set<string>();
  const converted = new Set<string>();
  let visited = 0, cancelled = 0, pending = 0, missed = 0;
  let totalExpense = 0, volumeGrams = 0, expectedGrams = 0;

  for (const v of visits) {
    const status = effectiveStatus(v, now);
    if (status === 'visited') visited++;
    else if (status === 'cancelled') cancelled++;
    else if (status === 'missed') missed++;
    else pending++;

    // Money is spent whether or not the meeting went well, so expense counts
    // on anything that was not cancelled.
    if (status !== 'cancelled') totalExpense += Number(v.expenseAmount) || 0;

    if (Number(v.expectedGrams) > 0) expectedGrams += Number(v.expectedGrams);

    if (status === 'visited') {
      if (v.outcome === 'interested') interested.add(v.contactId);
      if (v.outcome === 'converted') {
        converted.add(v.contactId);
        if (Number(v.actualGrams) > 0) volumeGrams += Number(v.actualGrams);
      } else if (Number(v.actualGrams) > 0) {
        // Grams can be recorded on a visit whose outcome was not flagged
        // "converted" — the weight is real either way.
        volumeGrams += Number(v.actualGrams);
      }
    }
  }

  const planned = visits.length;
  return {
    planned, visited, cancelled, pending, missed,
    totalExpense,
    interested: interested.size,
    converted: converted.size,
    volumeGrams,
    expectedGrams,
    completionPercent: planned === 0 ? 0 : Math.round((visited / planned) * 100),
  };
}

// ---- Exhibitions (PRD §16) -------------------------------------------------

export const JOURNEY_STATUSES = [
  'captured', 'contacted', 'active', 'not_interested', 'qualified', 'converted',
] as const;

export type JourneyStatus = (typeof JOURNEY_STATUSES)[number];

export const CAPTURE_SOURCES = [
  { value: 'business_card', label: 'Business card' },
  { value: 'register', label: 'Visitor register' },
  { value: 'import', label: 'Imported file' },
  { value: 'manual', label: 'Typed in' },
] as const;

export interface ExhibitionContactRow {
  journeyStatus: string;
  channelsUsed: string[];
  volumeGrams: number | null;
  captureSource: string;
}

export interface ExhibitionReport {
  captured: number;
  contacted: number;
  qualified: number;
  converted: number;
  notInterested: number;
  /** Still sitting at 'captured' — nobody has worked them yet. */
  untouched: number;
  volumeGrams: number;
  /** channel -> how many contacts were worked through it. */
  channelsUsed: Record<string, number>;
  bySource: Record<string, number>;
  /** Converted ÷ captured, whole percent. */
  conversionPercent: number;
}

/**
 * The §21.6 report over one exhibition's contacts.
 *
 * "Contacted" counts anyone who has moved past capture at all, including those
 * who went on to be qualified or converted — a funnel where the later stages
 * are missing from the earlier ones reads as though people skipped steps.
 */
export function summariseExhibition(rows: ExhibitionContactRow[]): ExhibitionReport {
  const channels: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  let contacted = 0, qualified = 0, converted = 0, notInterested = 0, untouched = 0;
  let volumeGrams = 0;

  for (const r of rows) {
    bySource[r.captureSource] = (bySource[r.captureSource] ?? 0) + 1;
    for (const c of r.channelsUsed) channels[c] = (channels[c] ?? 0) + 1;
    if (Number(r.volumeGrams) > 0) volumeGrams += Number(r.volumeGrams);

    switch (r.journeyStatus) {
      case 'captured': untouched++; break;
      case 'not_interested': notInterested++; contacted++; break;
      case 'converted': converted++; qualified++; contacted++; break;
      case 'qualified': qualified++; contacted++; break;
      default: contacted++; break; // 'contacted', 'active'
    }
  }

  const captured = rows.length;
  return {
    captured, contacted, qualified, converted, notInterested, untouched,
    volumeGrams, channelsUsed: channels, bySource,
    conversionPercent: captured === 0 ? 0 : Math.round((converted / captured) * 100),
  };
}

/**
 * Whether a journey move is allowed.
 *
 * Deliberately permissive in one direction: a lead can be revived from
 * 'not_interested' because in this trade they often are. What it refuses is
 * going backwards from a sale, which would quietly erase a conversion from
 * every report that counts one.
 */
export function canMoveJourney(from: string, to: string): boolean {
  if (!JOURNEY_STATUSES.includes(to as JourneyStatus)) return false;
  if (from === to) return true;
  if (from === 'converted') return false;
  return true;
}
