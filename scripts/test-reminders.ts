/**
 * Plan-event reminder tests.
 *
 * Run: npx tsx scripts/test-reminders.ts
 *
 * Reminders fail silently in both directions, which is why these exist. One
 * that never fires looks exactly like one nobody configured; one that fires
 * twice looks like a bug in the notification feed; and one that arrives after
 * the event it warned about teaches people to ignore the rest.
 *
 * Pure date arithmetic — no database, no network.
 */
import {
  dueReminders, anchorFor, normaliseOffsets, describeOffset,
  ALL_DAY_ANCHOR_HOUR, LATE_GRACE_MINUTES, MAX_REMINDERS_PER_EVENT, DAY_MINUTES,
} from '../lib/crm/reminders';

let pass = 0;
const failures: string[] = [];

function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; return; }
  failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

/** A timed activity: 2026-10-20 at 15:00 local. */
const start = new Date(2026, 9, 20, 15, 0, 0, 0);
const timed = (over: Partial<Parameters<typeof dueReminders>[0]> = {}) => ({
  date: start, allDay: false, remindOffsets: [], remindersSent: [], ...over,
});

const at = (mins: number) => new Date(start.getTime() - mins * 60_000);
const offsets = (rs: ReturnType<typeof dueReminders>) => rs.map((r) => r.offset);

/* ---- Nothing fires early --------------------------------------------------- */

check('a one-hour reminder is not due two hours out',
  dueReminders(timed({ remindOffsets: [60] }), at(120)).length, 0);
check('it is due exactly on the hour mark',
  offsets(dueReminders(timed({ remindOffsets: [60] }), at(60))), [60]);
check('and still due a minute later',
  offsets(dueReminders(timed({ remindOffsets: [60] }), at(59))), [60]);

/* ---- Several lead times on one event — the whole point --------------------- */

const three = timed({ remindOffsets: [2880, 60, 15] });

check('two days out, only the two-day reminder is due',
  offsets(dueReminders(three, at(2880))), [2880]);
check('an hour out, the two-day and one-hour ones are both outstanding',
  offsets(dueReminders(three, at(60))), [2880, 60]);
check('they come back oldest first',
  dueReminders(three, at(60))[0].offset, 2880);
check('fifteen minutes out, all three are outstanding',
  offsets(dueReminders(three, at(15))), [2880, 60, 15]);

// Once delivered, an offset never returns — this is what stops a reminder
// arriving again on every single cron run for the rest of the week.
check('a delivered reminder does not come back',
  offsets(dueReminders(timed({ remindOffsets: [2880, 60], remindersSent: [2880] }), at(60))), [60]);
check('and when all are delivered, nothing is due',
  dueReminders(timed({ remindOffsets: [2880, 60], remindersSent: [2880, 60] }), at(60)).length, 0);

/* ---- Too late to be true --------------------------------------------------- */

// The job was down. A "15 minutes before" that would now land after the event
// has already started is misinformation, so it is retired rather than sent.
const lateBy = (mins: number) => new Date(at(15).getTime() + mins * 60_000);
check('a reminder a few minutes late is still worth sending',
  dueReminders(timed({ remindOffsets: [15] }), lateBy(5))[0].stale, false);
check('one well past the grace window is marked stale',
  dueReminders(timed({ remindOffsets: [15] }), lateBy(LATE_GRACE_MINUTES + 10))[0].stale, true);
check('a stale reminder is still returned, so the job can retire it',
  offsets(dueReminders(timed({ remindOffsets: [15] }), lateBy(LATE_GRACE_MINUTES + 10))), [15]);

/* ---- All-day events are anchored to a civilised hour ----------------------- */

const allDayEvent = { date: new Date(2026, 9, 20, 0, 0, 0, 0), allDay: true };
check('an all-day activity is anchored to the morning, not midnight',
  anchorFor(allDayEvent).getHours(), ALL_DAY_ANCHOR_HOUR);
check('a timed activity is anchored to its own start',
  anchorFor({ date: start, allDay: false }).getHours(), 15);

// "1 day before" on an all-day event should land the previous morning, not at
// midnight the night before last.
const dayBefore = dueReminders(
  { ...allDayEvent, remindOffsets: [DAY_MINUTES], remindersSent: [] },
  new Date(2026, 9, 19, ALL_DAY_ANCHOR_HOUR, 0, 0, 0),
);
check('a day-before reminder on an all-day event fires the previous morning',
  offsets(dayBefore), [DAY_MINUTES]);
check('and not the evening before that',
  dueReminders(
    { ...allDayEvent, remindOffsets: [DAY_MINUTES], remindersSent: [] },
    new Date(2026, 9, 18, 20, 0, 0, 0),
  ).length, 0);

/* ---- Cleaning what the client sends ---------------------------------------- */

check('duplicates are collapsed, so nobody is told twice',
  normaliseOffsets([60, 60, 60]), [60]);
check('offsets come back furthest-out first, the order they fire',
  normaliseOffsets([15, 2880, 60]), [2880, 60, 15]);
check('a negative lead time is dropped, not scheduled after the event',
  normaliseOffsets([-30, 60]), [60]);
check('absurd lead times are dropped',
  normaliseOffsets([60, 999 * DAY_MINUTES]), [60]);
check('non-numbers are dropped',
  normaliseOffsets(['soon', null, 60] as unknown[]), [60]);
check('zero is kept — it means at the start',
  normaliseOffsets([0]), [0]);
check('the list is capped',
  normaliseOffsets([10080, 2880, 1440, 240, 60, 30, 15, 0]).length, MAX_REMINDERS_PER_EVENT);
check('anything that is not a list is no reminders',
  normaliseOffsets('60'), []);

/* ---- Wording --------------------------------------------------------------- */

check('zero reads as starting now', describeOffset(0), 'starting now');
check('a day reads as tomorrow', describeOffset(DAY_MINUTES), 'tomorrow');
check('two days read as days', describeOffset(2 * DAY_MINUTES), 'in 2 days');
check('seven days read as a week', describeOffset(7 * DAY_MINUTES), 'in a week');
check('sixty minutes read as an hour', describeOffset(60), 'in an hour');
check('four hours read as hours', describeOffset(240), 'in 4 hours');
check('fifteen minutes read as minutes', describeOffset(15), 'in 15 minutes');

/* ---- Report ---------------------------------------------------------------- */

if (failures.length) {
  console.error(`\n${failures.length} FAILED of ${pass + failures.length}:\n`);
  for (const f of failures) console.error(`  x ${f}\n`);
  process.exit(1);
}
console.log(`All ${pass} reminder checks passed.`);
