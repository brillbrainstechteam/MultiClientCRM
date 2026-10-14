/**
 * Embedded Signup session parsing tests.
 *
 * Run: npx tsx scripts/test-embedded-signup.ts
 *
 * The two things that were wrong, pinned down so they cannot regress:
 *
 *  - `FINISH_ONLY_WABA` (no phone number) was being read as coexistence, while
 *    the event that actually means coexistence —
 *    `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING` — was not recognised at all.
 *    That decides whether the one-time 24-hour history sync is ever requested.
 *  - A user-reported error arrives as `event: 'CANCEL'` with error fields in
 *    `data`, so switching on the event name alone files it as an ordinary
 *    abandonment and throws away the code and session id Meta support wants.
 *
 * Also covers the version extras: sending `sessionInfoVersion` is what pins an
 * integration to v2, which Meta retires on 15 October 2026.
 *
 * Pure functions — no database, no network.
 */
import {
  parseSessionEvent, connectionModeFromEvent, isWabaOnly, launchExtras,
} from '../lib/meta/embedded-signup';

let pass = 0;
const failures: string[] = [];

function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; return; }
  failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

/* ---- Successful completion ------------------------------------------------ */

const finish = parseSessionEvent({
  type: 'WA_EMBEDDED_SIGNUP',
  event: 'FINISH',
  data: {
    phone_number_id: '106540352242922',
    waba_id: '524126980791429',
    business_id: '2729063490586005',
  },
});
check('a completion is a finish', finish.kind, 'finish');
check('waba id captured', finish.wabaId, '524126980791429');
check('phone number id captured', finish.phoneNumberId, '106540352242922');
check('business portfolio id captured', finish.businessId, '2729063490586005');

/* ---- The two finish events that look alike -------------------------------- */

check('coexistence is recognised from its own event',
  connectionModeFromEvent('FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING', null), 'coexistence');
check('FINISH_ONLY_WABA is NOT coexistence — it means no phone number',
  connectionModeFromEvent('FINISH_ONLY_WABA', null), 'new_cloud_api');
check('and FINISH_ONLY_WABA is flagged as waba-only', isWabaOnly('FINISH_ONLY_WABA'), true);
check('a plain FINISH is not waba-only', isWabaOnly('FINISH'), false);
check('grant-only access is waba-only too', isWabaOnly('FINISH_GRANT_ONLY_API_ACCESS'), true);

check('an on-behalf-of migration is a provider move',
  connectionModeFromEvent('FINISH_OBO_MIGRATION', null), 'migrated_from_bsp');

// The event wins over the strategy, because the customer may land somewhere
// other than the path they picked on our screen.
check('the event beats a mismatched strategy',
  connectionModeFromEvent('FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING', 'new'), 'coexistence');

// A plain FINISH cannot distinguish a new number from a taken-over one, so the
// customer's own choice is the fallback.
check('FINISH + "existing" is a provider move',
  connectionModeFromEvent('FINISH', 'existing'), 'migrated_from_bsp');
check('FINISH + "new" is a new number',
  connectionModeFromEvent('FINISH', 'new'), 'new_cloud_api');
check('FINISH + "coexistence" trusts the strategy',
  connectionModeFromEvent('FINISH', 'coexistence'), 'coexistence');
check('no event and no strategy defaults to a new number',
  connectionModeFromEvent(null, null), 'new_cloud_api');

/* ---- Abandonment ---------------------------------------------------------- */

const cancel = parseSessionEvent({
  type: 'WA_EMBEDDED_SIGNUP',
  event: 'CANCEL',
  data: { current_step: 'PHONE_NUMBER_SETUP' },
});
check('an abandonment is a cancel', cancel.kind, 'cancel');
check('and records the screen they left on', cancel.currentStep, 'PHONE_NUMBER_SETUP');
check('with no error message', cancel.errorMessage, null);

/* ---- A reported error, which also arrives as CANCEL ----------------------- */

const reported = parseSessionEvent({
  type: 'WA_EMBEDDED_SIGNUP',
  event: 'CANCEL',
  data: {
    error_message: 'Your verified name violates WhatsApp guidelines.',
    error_code: '524126',
    session_id: 'f34b51dab5e0498',
    timestamp: '1746041036',
  },
});
check('a reported error is an error, not a cancel', reported.kind, 'error');
check('message kept', reported.errorMessage, 'Your verified name violates WhatsApp guidelines.');
check('code kept for support', reported.errorCode, '524126');
check('session id kept for support', reported.sessionId, 'f34b51dab5e0498');
check('timestamp kept', reported.timestamp, '1746041036');

check('an explicit ERROR event is still an error',
  parseSessionEvent({ event: 'ERROR', data: {} }).kind, 'error');

/* ---- Junk ----------------------------------------------------------------- */

check('an unknown event is not mistaken for a finish',
  parseSessionEvent({ event: 'SOMETHING_ELSE', data: {} }).kind, 'unknown');
check('an empty payload does not throw', parseSessionEvent({}).kind, 'unknown');
check('null does not throw', parseSessionEvent(null).kind, 'unknown');
check('missing data yields nulls, not undefined',
  parseSessionEvent({ event: 'FINISH' }).wabaId, null);
// Meta has sent numeric codes; both forms must survive.
check('a numeric error code is coerced to a string',
  parseSessionEvent({ event: 'CANCEL', data: { error_code: 524126 } }).errorCode, '524126');

/* ---- Launch extras: the version trap -------------------------------------- */

const extras = launchExtras('new');
check('v4 sends setup only', Object.keys(extras).sort(), ['setup']);
check('v4 must NOT send sessionInfoVersion — that is the v2 field',
  'sessionInfoVersion' in extras, false);

const coexExtras = launchExtras('coexistence');
check('coexistence still asks for its feature',
  (coexExtras as { featureType?: string }).featureType, 'whatsapp_business_app_onboarding');

/* ---- Report ---------------------------------------------------------------- */

if (failures.length) {
  console.error(`\n${failures.length} FAILED of ${pass + failures.length}:\n`);
  for (const f of failures) console.error(`  x ${f}\n`);
  process.exit(1);
}
console.log(`All ${pass} embedded-signup checks passed.`);
