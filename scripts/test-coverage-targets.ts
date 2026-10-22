/**
 * Absence/coverage and gram-target tests.
 *
 * Run: npx tsx scripts/test-coverage-targets.ts
 *
 * Coverage is the dangerous one. Get it too narrow and an absent agent's
 * customers go unanswered for a week with nobody able to help; get it too wide
 * and every agent can see and act on every other agent's book, which is both a
 * privacy problem and a commission argument. Worse, both failures look fine on
 * screen.
 *
 * Pure functions — no database, no network.
 */
import {
  isActive, activeAbsenceFor, availabilityOf, canCoverFor, coveringFor,
  isOnRelationshipTeam, sortTeam, describeRole,
  type AbsenceRow, type CoverageContext,
} from '../lib/crm/coverage';
import {
  periodLabel, periodRange, attainment, orderGrams, countsTowardTarget, formatGrams,
} from '../lib/crm/targets';

let pass = 0;
const failures: string[] = [];

function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; return; }
  failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

const d = (s: string) => new Date(s);
const NOW = d('2026-10-23T10:00:00');

function absence(over: Partial<AbsenceRow> & { userId: string }): AbsenceRow {
  return {
    id: `abs_${over.userId}`, kind: 'leave',
    startsAt: d('2026-10-20T00:00:00'), endsAt: d('2026-10-30T00:00:00'),
    endedAt: null, coveredByUserIds: [], ...over,
  };
}

/* ---- When an absence is in force ------------------------------------------ */

check('an absence covering today is active',
  isActive(absence({ userId: 'amit' }), NOW), true);
check('one that has not started yet is not',
  isActive(absence({ userId: 'amit', startsAt: d('2026-11-01T00:00:00') }), NOW), false);
check('one that has finished is not',
  isActive(absence({ userId: 'amit', endsAt: d('2026-10-21T00:00:00') }), NOW), false);
check('an open-ended absence runs until somebody ends it',
  isActive(absence({ userId: 'amit', endsAt: null }), NOW), true);
// Coming back early has to take effect immediately, not on the planned end
// date — otherwise a returning agent's work stays open to their colleagues.
check('coming back early ends it at once',
  isActive(absence({ userId: 'amit', endedAt: d('2026-10-22T00:00:00') }), NOW), false);

/* ---- Overlapping absences -------------------------------------------------- */

const overlapping = [
  absence({ userId: 'amit', id: 'week', startsAt: d('2026-10-19T00:00:00'), coveredByUserIds: ['rahul'] }),
  absence({ userId: 'amit', id: 'today', startsAt: d('2026-10-23T08:00:00'), kind: 'temporarily_unavailable', coveredByUserIds: ['sunil'] }),
];
check('the most recently started absence is the one in force',
  activeAbsenceFor(overlapping, 'amit', NOW)?.id, 'today');
check('and it is the one that decides who covers',
  canCoverFor({ absences: overlapping, zonesByUser: new Map() }, 'amit', 'sunil', NOW), true);

/* ---- Availability ---------------------------------------------------------- */

check('someone with no absence is available',
  availabilityOf([], 'amit', NOW), 'available');
check('an absence reports its own kind',
  availabilityOf([absence({ userId: 'amit', kind: 'leave' })], 'amit', NOW), 'leave');
check('a temporary one too',
  availabilityOf([absence({ userId: 'amit', kind: 'temporarily_unavailable' })], 'amit', NOW), 'temporarily_unavailable');

/* ---- Who may cover --------------------------------------------------------- */

const zones = new Map([
  ['amit', ['north']],
  ['rahul', ['north']],
  ['priya', ['south']],
  ['owner', ['north', 'south']],
]);

const named: CoverageContext = {
  absences: [absence({ userId: 'amit', coveredByUserIds: ['rahul'] })],
  zonesByUser: zones,
};

check('a named cover may act', canCoverFor(named, 'amit', 'rahul', NOW), true);
check('someone not named may not, even in the same zone',
  canCoverFor(named, 'amit', 'sunil', NOW), false);

// The single most important case: no absence, no coverage. Being listed as
// cover is not standing access to a colleague's customers.
check('nobody covers an agent who is present',
  canCoverFor({ absences: [], zonesByUser: zones }, 'amit', 'rahul', NOW), false);
check('and not before the absence starts',
  canCoverFor(
    { absences: [absence({ userId: 'amit', startsAt: d('2026-11-01T00:00:00'), coveredByUserIds: ['rahul'] })], zonesByUser: zones },
    'amit', 'rahul', NOW), false);
check('nor after it ends',
  canCoverFor(
    { absences: [absence({ userId: 'amit', endsAt: d('2026-10-21T00:00:00'), coveredByUserIds: ['rahul'] })], zonesByUser: zones },
    'amit', 'rahul', NOW), false);

check('you never cover yourself',
  canCoverFor(named, 'amit', 'amit', NOW), false);

/* ---- The zone fallback ----------------------------------------------------- */

const unnamed: CoverageContext = {
  absences: [absence({ userId: 'amit', coveredByUserIds: [] })],
  zonesByUser: zones,
};
check('with nobody named, the zone covers',
  canCoverFor(unnamed, 'amit', 'rahul', NOW), true);
check('but another zone does not',
  canCoverFor(unnamed, 'amit', 'priya', NOW), false);

const withBoss: CoverageContext = { ...named, supervisorIds: new Set(['owner']) };
check('a supervisor covers even when somebody else was named',
  canCoverFor(withBoss, 'amit', 'owner', NOW), true);

/* ---- Whose work an agent can pick up --------------------------------------- */

const many: CoverageContext = {
  absences: [
    absence({ userId: 'amit', coveredByUserIds: ['rahul'] }),
    absence({ userId: 'priya', coveredByUserIds: ['rahul'] }),
    absence({ userId: 'vikram', coveredByUserIds: ['sunil'] }),
  ],
  zonesByUser: zones,
};
check('an agent sees exactly the absent colleagues they cover',
  coveringFor(many, 'rahul', NOW).sort(), ['amit', 'priya']);
check('and nothing when they cover nobody',
  coveringFor(many, 'deepak', NOW), []);

/* ---- Relationship Team ------------------------------------------------------ */

const team = [
  { contactId: 'c1', userId: 'amit', role: 'primary', position: 0 },
  { contactId: 'c1', userId: 'rahul', role: 'backup', position: 2 },
  { contactId: 'c1', userId: 'sunil', role: 'backup', position: 1 },
  { contactId: 'c1', userId: 'owner', role: 'manager', position: 0 },
];

// Standing access, unlike coverage — this is what lets a backup answer without
// being a participant in any WhatsApp group (GRP-04).
check('a named backup may act without any absence',
  isOnRelationshipTeam(team, 'c1', 'rahul'), true);
check('someone not on the team may not',
  isOnRelationshipTeam(team, 'c1', 'deepak'), false);
check('and team membership does not carry to another customer',
  isOnRelationshipTeam(team, 'c2', 'rahul'), false);

// Alphabetically "backup" < "manager" < "primary", which is exactly backwards.
check('the team reads primary, backups in order, then manager',
  sortTeam(team).map((m) => m.userId), ['amit', 'sunil', 'rahul', 'owner']);

check('roles are described the way people say them',
  [describeRole('primary', 0), describeRole('backup', 2), describeRole('manager', 0)],
  ['Primary', 'Backup 2', 'Manager']);

/* ---- Target periods --------------------------------------------------------- */

check('October 2026 is in FY 2026-27',
  periodLabel(d('2026-10-23T00:00:00')), '2026-27');
// The boundary: March belongs to the year before, April starts the new one.
check('March 2026 is still FY 2025-26',
  periodLabel(d('2026-03-31T00:00:00')), '2025-26');
check('April 2026 begins FY 2026-27',
  periodLabel(d('2026-04-01T00:00:00')), '2026-27');
// Nobody calls the calendar year 2026 "2026-27", so a January start drops the
// spanning half of the label.
check('a January start month is a plain calendar year',
  periodLabel(d('2026-03-31T00:00:00'), 1), '2026');
check('and such a label still resolves to a range',
  periodRange('2026', 1)?.start.getFullYear(), 2026);

const range = periodRange('2026-27');
check('a period starts on 1 April', [range?.start.getMonth(), range?.start.getDate()], [3, 1]);
check('and ends the following 1 April', [range?.end.getFullYear(), range?.end.getMonth()], [2027, 3]);
check('a malformed label is rejected rather than guessed at',
  periodRange('FY2026'), null);

/* ---- Attainment -------------------------------------------------------------- */

check('half way there',
  attainment(1000, 500), { targetGrams: 1000, achievedGrams: 500, remainingGrams: 500, percent: 50, met: false });
check('a met target reports nothing remaining',
  attainment(1000, 1000).remainingGrams, 0);
check('and is marked met', attainment(1000, 1000).met, true);
// Overachievement must not show "-250 g remaining".
check('overachievement never goes negative',
  attainment(1000, 1250).remainingGrams, 0);
check('but the percent still shows the overshoot',
  attainment(1000, 1250).percent, 125);
// A target of zero would divide to Infinity on a dashboard.
check('no target reports 0%, not Infinity',
  attainment(0, 500).percent, 0);
check('and is never "met"', attainment(0, 500).met, false);
check('nonsense input is treated as nothing',
  attainment(Number.NaN, Number.NaN), { targetGrams: 0, achievedGrams: 0, remainingGrams: 0, percent: 0, met: false });

/* ---- Order grams ------------------------------------------------------------- */

check('line grams are summed',
  orderGrams([{ grams: 24 }, { grams: 48 }]), 72);
check('lines with no weight are skipped, not treated as zero-length errors',
  orderGrams([{ grams: 24 }, { grams: null }, { grams: undefined }]), 24);
check('negative or nonsense weights are ignored',
  orderGrams([{ grams: 24 }, { grams: -10 }, { grams: Number.NaN }]), 24);

/* ---- What counts ------------------------------------------------------------- */

// A quotation is not a sale. Counting one would let an agent hit a yearly
// target by raising quotations nobody accepted.
check('a quotation does not count', countsTowardTarget({ status: 'quotation' }), false);
check('an enquiry does not count', countsTowardTarget({ status: 'enquiry' }), false);
check('a draft does not count', countsTowardTarget({ status: 'draft' }), false);
check('a confirmed order counts', countsTowardTarget({ status: 'confirmed' }), true);
check('a delivered order counts', countsTowardTarget({ status: 'delivered' }), true);
check('a cancelled order does not', countsTowardTarget({ status: 'cancelled' }), false);
check('a returned order does not', countsTowardTarget({ status: 'returned' }), false);
// The tenant's own switch overrides everything (§26).
check('an order marked not-counting is excluded even when confirmed',
  countsTowardTarget({ status: 'confirmed', countsTowardTarget: false }), false);

/* ---- Formatting ---------------------------------------------------------------- */

check('grams under a kilo read as grams', formatGrams(750), '750 g');
check('and over a kilo as kilos', formatGrams(1250), '1.25 kg');
check('zero is still grams', formatGrams(0), '0 g');

/* ---- Report ---------------------------------------------------------------------- */

if (failures.length) {
  console.error(`\n${failures.length} FAILED of ${pass + failures.length}:\n`);
  for (const f of failures) console.error(`  x ${f}\n`);
  process.exit(1);
}
console.log(`All ${pass} coverage/target checks passed.`);
