/**
 * Field visit and exhibition tests.
 *
 * Run: npx tsx scripts/test-visits.ts
 *
 * Two things here fail quietly and expensively. If "missed" and "pending" are
 * collapsed, a field team builds a backlog nobody can see — every overdue
 * visit still reads as upcoming. And if customers are counted per visit rather
 * than distinctly, three visits to one jeweller who bought makes the team look
 * three times as effective as it was.
 *
 * Pure functions — no database, no network.
 */
import {
  effectiveStatus, summariseVisits, summariseExhibition, canMoveJourney,
  type VisitRow, type ExhibitionContactRow,
} from '../lib/crm/visits';

let pass = 0;
const failures: string[] = [];

function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; return; }
  failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

const NOW = new Date(2026, 9, 23, 14, 0, 0); // 23 Oct 2026, 2pm
const day = (d: number) => new Date(2026, 9, d, 10, 0, 0);

function visit(over: Partial<VisitRow> = {}): VisitRow {
  return {
    status: 'planned', plannedAt: day(25), visitedAt: null, outcome: null,
    expenseAmount: null, expectedGrams: null, actualGrams: null,
    contactId: 'c1', assigneeUserId: 'amit', ...over,
  };
}

/* ---- Planned, missed, done ------------------------------------------------- */

check('a visit planned for next week is still pending',
  effectiveStatus(visit({ plannedAt: day(25) }), NOW), 'planned');

// The case that makes "visits pending" real: a date that has passed with
// nothing logged is a missed visit, not an upcoming one.
check('a planned visit whose day has passed is missed',
  effectiveStatus(visit({ plannedAt: day(21) }), NOW), 'missed');

// ...but not before the day is over. A visit planned for today at an unknown
// hour must not read as missed at 2pm.
check('a visit planned for today is not missed mid-afternoon',
  effectiveStatus(visit({ plannedAt: day(23) }), NOW), 'planned');

check('a logged visit stays visited however old it is',
  effectiveStatus(visit({ status: 'visited', plannedAt: day(1) }), NOW), 'visited');
check('a cancelled visit is never missed',
  effectiveStatus(visit({ status: 'cancelled', plannedAt: day(1) }), NOW), 'cancelled');

// Logging a visit late must simply make it visited again, with no repair job.
check('logging an overdue visit clears the missed state',
  effectiveStatus(visit({ status: 'visited', plannedAt: day(21) }), NOW), 'visited');

/* ---- The report ------------------------------------------------------------- */

const set: VisitRow[] = [
  visit({ status: 'visited', plannedAt: day(20), outcome: 'converted', contactId: 'c1', expenseAmount: 1200, actualGrams: 250, expectedGrams: 200 }),
  visit({ status: 'visited', plannedAt: day(21), outcome: 'interested', contactId: 'c2', expenseAmount: 800, expectedGrams: 100 }),
  visit({ status: 'visited', plannedAt: day(22), outcome: 'not_interested', contactId: 'c3', expenseAmount: 500 }),
  visit({ status: 'planned', plannedAt: day(28), contactId: 'c4', expenseAmount: 0 }),
  visit({ status: 'planned', plannedAt: day(19), contactId: 'c5' }),        // overdue
  visit({ status: 'cancelled', plannedAt: day(18), contactId: 'c6', expenseAmount: 999 }),
];

const r = summariseVisits(set, NOW);
check('every planned visit is counted', r.planned, 6);
check('three were visited', r.visited, 3);
check('one is still ahead', r.pending, 1);
check('one was missed', r.missed, 1);
check('one was cancelled', r.cancelled, 1);
check('one customer was interested', r.interested, 1);
check('one customer converted', r.converted, 1);
check('volume bought is the actual grams', r.volumeGrams, 250);
check('expected grams are totalled separately', r.expectedGrams, 300);

// A cancelled visit costs nothing; the rest do, whether or not they went well.
check('cancelled spend is excluded', r.totalExpense, 2500);
check('completion is visited over planned', r.completionPercent, 50);

/* ---- Customers are counted once -------------------------------------------- */

// Three visits to the same jeweller who bought is ONE converted customer.
const repeat = summariseVisits([
  visit({ status: 'visited', plannedAt: day(10), outcome: 'converted', contactId: 'c1', actualGrams: 100 }),
  visit({ status: 'visited', plannedAt: day(15), outcome: 'converted', contactId: 'c1', actualGrams: 150 }),
  visit({ status: 'visited', plannedAt: day(20), outcome: 'converted', contactId: 'c1', actualGrams: 50 }),
], NOW);
check('repeat visits to one customer convert one customer', repeat.converted, 1);
// ...but every gram they bought still counts.
check('and all their grams still count', repeat.volumeGrams, 300);

// Grams recorded on a visit not flagged "converted" are still real weight.
check('grams count even when the outcome was only "interested"',
  summariseVisits([visit({ status: 'visited', plannedAt: day(20), outcome: 'interested', actualGrams: 75 })], NOW).volumeGrams, 75);

check('an empty report does not divide by zero',
  summariseVisits([], NOW).completionPercent, 0);

/* ---- Exhibitions ------------------------------------------------------------ */

function ec(over: Partial<ExhibitionContactRow> = {}): ExhibitionContactRow {
  return { journeyStatus: 'captured', channelsUsed: [], volumeGrams: null, captureSource: 'business_card', ...over };
}

const exh = summariseExhibition([
  ec({ journeyStatus: 'converted', channelsUsed: ['call', 'whatsapp'], volumeGrams: 500 }),
  ec({ journeyStatus: 'qualified', channelsUsed: ['call'] }),
  ec({ journeyStatus: 'contacted', channelsUsed: ['whatsapp'] }),
  ec({ journeyStatus: 'not_interested', channelsUsed: ['call'] }),
  ec({ journeyStatus: 'captured', captureSource: 'register' }),
  ec({ journeyStatus: 'captured', captureSource: 'register' }),
]);

check('everyone captured is counted', exh.captured, 6);
// A funnel whose later stages are missing from the earlier ones reads as
// though people skipped steps, so converted and qualified count as contacted.
check('contacted includes everyone worked at all', exh.contacted, 4);
check('converted counts as qualified too', exh.qualified, 2);
check('one converted', exh.converted, 1);
check('two were never worked', exh.untouched, 2);
check('volume is summed', exh.volumeGrams, 500);
check('conversion is over everyone captured', exh.conversionPercent, 17);
check('channels are tallied across contacts',
  exh.channelsUsed, { call: 3, whatsapp: 2 });
check('capture sources are tallied',
  exh.bySource, { business_card: 4, register: 2 });

check('an empty exhibition does not divide by zero',
  summariseExhibition([]).conversionPercent, 0);

/* ---- Journey moves ----------------------------------------------------------- */

check('a captured lead can be contacted', canMoveJourney('captured', 'contacted'), true);
// In this trade a "not interested" lead is revived constantly.
check('a cold lead can be revived', canMoveJourney('not_interested', 'contacted'), true);
// But a sale must not be quietly erased from every report that counts it.
check('a conversion cannot be undone by a status change',
  canMoveJourney('converted', 'not_interested'), false);
check('a conversion can be re-saved as itself',
  canMoveJourney('converted', 'converted'), true);
check('an unknown status is refused',
  canMoveJourney('captured', 'maybe_later'), false);

/* ---- Report -------------------------------------------------------------------- */

if (failures.length) {
  console.error(`\n${failures.length} FAILED of ${pass + failures.length}:\n`);
  for (const f of failures) console.error(`  x ${f}\n`);
  process.exit(1);
}
console.log(`All ${pass} visit/exhibition checks passed.`);
