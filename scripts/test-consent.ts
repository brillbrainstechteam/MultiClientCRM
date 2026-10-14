/**
 * Consent classifier + funnel-stage tests.
 *
 * Run: npx tsx scripts/test-consent.ts
 *
 * These cover the two ways the consent flow can do real damage: treating an
 * ordinary "yes" as a marketing opt-in (consent that cannot be defended), and
 * failing to honour a stop word (blocks, and a falling quality rating). No
 * database is touched — this is pure classification.
 */
import {
  classifyConsentReply, consentStage, CONSENT_PAYLOAD_IN, CONSENT_PAYLOAD_OUT,
  REQUEST_WINDOW_DAYS, REASK_COOLDOWN_DAYS,
} from '../lib/crm/consent';

let pass = 0;
const failures: string[] = [];

function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; return; }
  failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

/* ---- Button presses are authoritative ------------------------------------ */

check('quick-reply YES payload opts in',
  classifyConsentReply({ buttonPayload: CONSENT_PAYLOAD_IN }).decision, 'in');
check('quick-reply NO payload opts out',
  classifyConsentReply({ buttonPayload: CONSENT_PAYLOAD_OUT }).decision, 'out');
check('button channel is recorded',
  classifyConsentReply({ buttonPayload: CONSENT_PAYLOAD_IN }).channel, 'whatsapp_button');
check('button works with no pending request',
  classifyConsentReply({ buttonPayload: CONSENT_PAYLOAD_IN, requestPending: false }).decision, 'in');
check('button text "Yes, keep me updated" opts in',
  classifyConsentReply({ buttonPayload: 'Yes, keep me updated' }).decision, 'in');
check('button text "No thanks" opts out',
  classifyConsentReply({ buttonPayload: 'No thanks' }).decision, 'out');
check('unrelated button payload decides nothing',
  classifyConsentReply({ buttonPayload: 'VIEW_CATALOGUE' }).decision, null);

/* ---- Stop words are always honoured -------------------------------------- */

for (const word of ['STOP', 'stop', 'Stop.', 'UNSUBSCRIBE', 'opt out', 'remove me', 'band karo', 'bandh karo', 'mat bhejo']) {
  check(`"${word}" opts out without a pending request`,
    classifyConsentReply({ text: word, requestPending: false }).decision, 'out');
}
check('stop inside a sentence still opts out',
  classifyConsentReply({ text: 'please stop sending these' }).decision, 'out');
check('stop word channel is keyword',
  classifyConsentReply({ text: 'STOP' }).channel, 'whatsapp_keyword');
check('a word merely containing "stop" does not opt out',
  classifyConsentReply({ text: 'the stopwatch arrived' }).decision, null);

/* ---- Agreement words need an outstanding request ------------------------- */

check('"yes" with a pending request opts in',
  classifyConsentReply({ text: 'Yes', requestPending: true }).decision, 'in');
check('"haan" with a pending request opts in',
  classifyConsentReply({ text: 'haan', requestPending: true }).decision, 'in');
check('"theek hai" with a pending request opts in',
  classifyConsentReply({ text: 'Theek hai', requestPending: true }).decision, 'in');
check('"yes" with NO pending request decides nothing',
  classifyConsentReply({ text: 'Yes', requestPending: false }).decision, null);
check('"ok" mid-negotiation decides nothing without a request',
  classifyConsentReply({ text: 'ok', requestPending: false }).decision, null);
check('a yes buried in a longer sentence is not consent',
  classifyConsentReply({ text: 'yes send me the 22k rate list', requestPending: true }).decision, null);
check('an ordinary enquiry decides nothing',
  classifyConsentReply({ text: 'Do you have antique bridal sets in 40-60g?', requestPending: true }).decision, null);
check('empty message decides nothing',
  classifyConsentReply({ text: '', requestPending: true }).decision, null);
check('no text and no button decides nothing',
  classifyConsentReply({}).decision, null);

/* ---- A stop word wins over an agreement word ----------------------------- */

check('"yes but stop the offers" opts out',
  classifyConsentReply({ text: 'yes but stop the offers', requestPending: true }).decision, 'out');

/* ---- Funnel stages ------------------------------------------------------- */

const now = new Date('2026-10-14T10:00:00Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

check('opted-in contact is opted_in',
  consentStage({ consent: 'opted-in', consentRequestedAt: daysAgo(90) }, now), 'opted_in');
check('opted-out contact is opted_out',
  consentStage({ consent: 'opted-out', consentRequestedAt: null }, now), 'opted_out');
check('never asked is never_asked',
  consentStage({ consent: 'pending', consentRequestedAt: null }, now), 'never_asked');
check('asked today is awaiting_reply',
  consentStage({ consent: 'pending', consentRequestedAt: now }, now), 'awaiting_reply');
check(`asked ${REQUEST_WINDOW_DAYS - 1}d ago is awaiting_reply`,
  consentStage({ consent: 'pending', consentRequestedAt: daysAgo(REQUEST_WINDOW_DAYS - 1) }, now), 'awaiting_reply');
check(`asked ${REQUEST_WINDOW_DAYS + 1}d ago is request_expired`,
  consentStage({ consent: 'pending', consentRequestedAt: daysAgo(REQUEST_WINDOW_DAYS + 1) }, now), 'request_expired');
check('an opt-out never reverts to a funnel stage on age',
  consentStage({ consent: 'opted-out', consentRequestedAt: daysAgo(REASK_COOLDOWN_DAYS + 10) }, now), 'opted_out');

/* ---- Report -------------------------------------------------------------- */

if (failures.length) {
  console.error(`\n${failures.length} FAILED of ${pass + failures.length}:\n`);
  for (const f of failures) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`All ${pass} consent checks passed.`);
