/**
 * WhatsApp calling domain tests.
 *
 * Run: npx tsx scripts/test-calling.ts
 *
 * Business hours are the part of this that will be wrong silently. A shop in
 * Kochi writes "10:00–19:00" meaning its own clock, and the server runs in UTC;
 * get that backwards and the phone line closes at half past four in the
 * afternoon with nobody able to explain why. The Meta mapping is the other
 * half: call_hours is replace-not-merge on Meta's side, so a patch that looks
 * harmless silently clears the holiday list.
 *
 * Pure functions — no database, no network.
 */
import {
  isWithinBusinessHours, toMetaHours, fromMetaHours, toMetaSettings, isLive,
  callDeepLink,
  type DayHours,
} from '../lib/whatsapp/calling';

let pass = 0;
const failures: string[] = [];

function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; return; }
  failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

const MON_SAT_10_7: DayHours[] = [1, 2, 3, 4, 5, 6].map((day) => ({ day, open: '10:00', close: '19:00' }));

const IST = { businessHours: MON_SAT_10_7, holidays: [], timezone: 'Asia/Kolkata' };

/* ---- Hours are read in the shop's own timezone ----------------------------- */

// 2026-10-19 is a Monday. 06:00 UTC = 11:30 IST — open.
check('open during shop hours, read in IST',
  isWithinBusinessHours(IST, new Date('2026-10-19T06:00:00Z')).open, true);

// 16:00 UTC = 21:30 IST — long closed, though still mid-afternoon in UTC.
check('closed in the evening, even though UTC says afternoon',
  isWithinBusinessHours(IST, new Date('2026-10-19T16:00:00Z')).open, false);

// 03:00 UTC = 08:30 IST — before opening.
check('closed before opening time',
  isWithinBusinessHours(IST, new Date('2026-10-19T03:00:00Z')).open, false);

// 2026-10-18 is a Sunday, which is not in the list at all.
check('closed on a day with no hours',
  isWithinBusinessHours(IST, new Date('2026-10-18T06:00:00Z')).open, false);
check('and says why',
  isWithinBusinessHours(IST, new Date('2026-10-18T06:00:00Z')).reason, 'Closed today');

/* ---- Boundaries ------------------------------------------------------------ */

// 04:30 UTC = exactly 10:00 IST.
check('open exactly at opening time',
  isWithinBusinessHours(IST, new Date('2026-10-19T04:30:00Z')).open, true);
// 13:30 UTC = exactly 19:00 IST — closing time is exclusive, as a shop door is.
check('closed exactly at closing time',
  isWithinBusinessHours(IST, new Date('2026-10-19T13:30:00Z')).open, false);

/* ---- Midnight, where hour12:false spells 00 as "24" ------------------------ */

const ALL_NIGHT = { businessHours: [{ day: 1, open: '00:00', close: '23:59' }], holidays: [], timezone: 'Asia/Kolkata' };
// 18:30 UTC Sunday = 00:00 IST Monday. The local day must roll over too.
check('midnight in the shop timezone counts as the new day',
  isWithinBusinessHours(ALL_NIGHT, new Date('2026-10-18T18:30:00Z')).open, true);

/* ---- Holidays beat hours --------------------------------------------------- */

const DIWALI = {
  businessHours: MON_SAT_10_7,
  holidays: [{ date: '2026-10-19', name: 'Diwali' }],
  timezone: 'Asia/Kolkata',
};
check('a holiday closes a day that would otherwise be open',
  isWithinBusinessHours(DIWALI, new Date('2026-10-19T06:00:00Z')).open, false);
check('and names the holiday',
  isWithinBusinessHours(DIWALI, new Date('2026-10-19T06:00:00Z')).reason, 'Closed for Diwali');

/* ---- No hours means always open, not never open ---------------------------- */

check('an unconfigured shop is reachable',
  isWithinBusinessHours({ businessHours: [], holidays: [], timezone: 'Asia/Kolkata' }).open, true);
check('a null hours column is reachable too',
  isWithinBusinessHours({ businessHours: null, holidays: null, timezone: null }).open, true);

// A typo in the timezone must not take the phone line down.
check('an invalid timezone does not close the line',
  isWithinBusinessHours({ businessHours: MON_SAT_10_7, holidays: [], timezone: 'Not/AZone' },
    new Date('2026-10-19T06:00:00Z')).open !== undefined, true);

/* ---- Meta mapping round-trips ---------------------------------------------- */

check('days map to Meta day names and HHMM',
  toMetaHours([{ day: 1, open: '10:00', close: '19:00' }]),
  [{ day_of_week: 'MONDAY', open_time: '1000', close_time: '1900' }]);

check('Sunday is day 0, not day 7',
  toMetaHours([{ day: 0, open: '11:00', close: '16:00' }])[0].day_of_week, 'SUNDAY');

check('Meta hours map back to our shape',
  fromMetaHours([{ day_of_week: 'SATURDAY', open_time: '0930', close_time: '2030' }]),
  [{ day: 6, open: '09:30', close: '20:30' }]);

check('a round trip changes nothing',
  fromMetaHours(toMetaHours(MON_SAT_10_7)), MON_SAT_10_7);

check('an unrecognised day name is dropped, not mapped to Sunday',
  fromMetaHours([{ day_of_week: 'CATURDAY', open_time: '0900', close_time: '1700' }]), []);

/* ---- Settings translation -------------------------------------------------- */

const base = {
  enabled: true, callIconVisible: true, inboundEnabled: true, outboundEnabled: true,
  timezone: 'Asia/Kolkata', businessHours: MON_SAT_10_7, holidays: [],
  afterHoursBehaviour: 'voicemail',
};

check('calling on maps to ENABLED', toMetaSettings(base).status, 'ENABLED');
check('calling off maps to DISABLED',
  toMetaSettings({ ...base, enabled: false }).status, 'DISABLED');

// "Customers can call us: OFF" has to hide the entry points, not just the icon,
// or a deep link still rings a phone nobody is answering.
check('inbound off hides every entry point',
  toMetaSettings({ ...base, inboundEnabled: false }).call_icon_visibility, 'DISABLE_ALL');
check('inbound on shows the call button',
  toMetaSettings(base).call_icon_visibility, 'DEFAULT');
check('calling off hides the button regardless of the inbound toggle',
  toMetaSettings({ ...base, enabled: false }).call_icon_visibility, 'DISABLE_ALL');

check('outbound drives callback permission',
  toMetaSettings({ ...base, outboundEnabled: false }).callback_permission_status, 'DISABLED');

check('configured hours enable call_hours',
  toMetaSettings(base).call_hours?.status, 'ENABLED');
check('no hours means Meta treats the number as open all week',
  toMetaSettings({ ...base, businessHours: [] }).call_hours?.status, 'DISABLED');

// Meta caps the holiday list at 20 and we must not send a 21st, which would
// fail the whole settings write and leave hours unsaved with it.
const manyHolidays = Array.from({ length: 25 }, (_, i) => ({ date: `2026-01-${String(i + 1).padStart(2, '0')}` }));
check('holidays are capped at Meta’s limit of 20',
  toMetaSettings({ ...base, holidays: manyHolidays }).call_hours?.holiday_schedule?.length, 20);

check('voicemail is on when that is the after-hours choice',
  toMetaSettings(base).voicemail?.status, 'ENABLED');
check('and off when it is not',
  toMetaSettings({ ...base, afterHoursBehaviour: 'ring_anyway' }).voicemail?.status, 'DISABLED');

/* ---- Call state ------------------------------------------------------------ */

check('a ringing call can still be acted on', isLive('ringing'), true);
check('a connected call can still be acted on', isLive('connected'), true);
check('an ended call cannot', isLive('ended'), false);
check('a missed call cannot', isLive('missed'), false);
check('a rejected call cannot', isLive('rejected'), false);
check('a failed call cannot', isLive('failed'), false);

/* ---- Deep links ------------------------------------------------------------ */

check('a deep link strips formatting from the number',
  callDeepLink('+91 98200 00000'), 'https://wa.me/call/919820000000');
check('a payload is carried so the call can be attributed',
  callDeepLink('+919820000000', 'counter-qr'), 'https://wa.me/call/919820000000?payload=counter-qr');
// A payload with spaces or punctuation would not survive the round trip.
check('an unsafe payload is normalised rather than dropped',
  callDeepLink('+919820000000', 'Diwali Counter!'), 'https://wa.me/call/919820000000?payload=Diwali-Counter-');
check('an empty payload leaves a plain link',
  callDeepLink('+919820000000', '   '), 'https://wa.me/call/919820000000');

/* ---- Report ---------------------------------------------------------------- */

if (failures.length) {
  console.error(`\n${failures.length} FAILED of ${pass + failures.length}:\n`);
  for (const f of failures) console.error(`  x ${f}\n`);
  process.exit(1);
}
console.log(`All ${pass} calling checks passed.`);
