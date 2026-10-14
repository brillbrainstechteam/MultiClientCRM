/**
 * Template conformance + quick-reply tests.
 *
 * Run: npx tsx scripts/test-templates-quickreplies.ts
 *
 * The template checks encode Meta's published limits, so if Meta changes them
 * this file is the place that should fail first. Numbers come from
 * developers.facebook.com/docs/whatsapp/business-management-api/message-templates
 * and .../message-templates/components.
 *
 * Pure functions only — no database.
 */
import {
  renderQuickReply, normaliseShortcut, validateQuickReply,
  SHORTCUT_MAX, WHATSAPP_TEXT_LIMIT,
} from '../lib/crm/quick-replies';
import { isMediaHeader, headerParamType } from '../crm/modules/templates/domain/types';

let pass = 0;
const failures: string[] = [];

function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; return; }
  failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

/* ---- Quick reply: shortcuts ---------------------------------------------- */

check('a leading slash is stripped', normaliseShortcut('/timings'), 'timings');
check('case is folded', normaliseShortcut('StoreTimings'), 'storetimings');
check('spaces become hyphens', normaliseShortcut('store timings'), 'store-timings');
check('punctuation is replaced', normaliseShortcut('rate?list!'), 'rate-list');
check('edges are trimmed', normaliseShortcut('--gold--'), 'gold');
check(`shortcuts are capped at ${SHORTCUT_MAX}`, normaliseShortcut('x'.repeat(40)).length, SHORTCUT_MAX);
check('an empty shortcut stays empty', normaliseShortcut('///'), '');

/* ---- Quick reply: placeholders ------------------------------------------- */

const ctx = { name: 'Rajesh', company: 'Shree Jewellers', city: 'Jaipur', agent: 'Meera' };

check('{{name}} is filled',
  renderQuickReply('Hi {{name}}, how can I help?', ctx), 'Hi Rajesh, how can I help?');
check('{{1}} is the customer name too, as in templates',
  renderQuickReply('Hi {{1}}!', ctx), 'Hi Rajesh!');
check('several placeholders in one reply',
  renderQuickReply('{{name}} from {{company}} in {{city}}', ctx), 'Rajesh from Shree Jewellers in Jaipur');
check('spacing inside the braces is tolerated',
  renderQuickReply('Hi {{ name }}', ctx), 'Hi Rajesh');
check('a missing name degrades to a greeting, never the raw token',
  renderQuickReply('Hi {{name}}, welcome', { name: null }), 'Hi there, welcome');
check('an unknown placeholder is left alone rather than blanked',
  renderQuickReply('Order {{orderNo}} ready', ctx), 'Order {{orderNo}} ready');
check('an empty optional value does not leave a double space',
  renderQuickReply('Visit us in {{city}} today', { city: '' }), 'Visit us in today');

/* ---- Quick reply: validation --------------------------------------------- */

const ok = { shortcut: 'timings', title: 'Store timings', body: 'We are open 11am to 8pm.' };
check('a well-formed quick reply has no issues', validateQuickReply(ok).length, 0);
check('a missing shortcut is rejected',
  validateQuickReply({ ...ok, shortcut: '' }).some((i) => i.field === 'shortcut'), true);
check('a missing title is rejected',
  validateQuickReply({ ...ok, title: '  ' }).some((i) => i.field === 'title'), true);
check('an empty body is rejected',
  validateQuickReply({ ...ok, body: '' }).some((i) => i.field === 'body'), true);
check(`a body over ${WHATSAPP_TEXT_LIMIT} characters is rejected`,
  validateQuickReply({ ...ok, body: 'x'.repeat(WHATSAPP_TEXT_LIMIT + 1) }).some((i) => i.field === 'body'), true);
check('a body at the limit is accepted',
  validateQuickReply({ ...ok, body: 'x'.repeat(WHATSAPP_TEXT_LIMIT) }).length, 0);
check('an unfillable placeholder is flagged before it reaches a customer',
  validateQuickReply({ ...ok, body: 'Your order {{orderNo}} is ready' })
    .some((i) => i.message.includes('orderNo')), true);
check('known placeholders pass',
  validateQuickReply({ ...ok, body: 'Hi {{name}} from {{company}}' }).length, 0);
check('{{1}} passes, since templates use it',
  validateQuickReply({ ...ok, body: 'Hi {{1}}' }).length, 0);

/* ---- Template header formats (Meta) -------------------------------------- */

check('image is a media header', isMediaHeader('image'), true);
check('video is a media header', isMediaHeader('video'), true);
check('gif is a media header', isMediaHeader('gif'), true);
check('document is a media header', isMediaHeader('document'), true);
check('text is not a media header', isMediaHeader('text'), false);
check('location is not a media header', isMediaHeader('location'), false);
check('none is not a media header', isMediaHeader('none'), false);

// A GIF header is an mp4: the Cloud API takes it as `video`, never as `gif`.
check('gif is sent as video', headerParamType('gif'), 'video');
check('video stays video', headerParamType('video'), 'video');
check('image stays image', headerParamType('image'), 'image');
check('document stays document', headerParamType('document'), 'document');
check('text has no media parameter', headerParamType('text'), null);
check('location has no media parameter', headerParamType('location'), null);

/* ---- Report --------------------------------------------------------------- */

if (failures.length) {
  console.error(`\n${failures.length} FAILED of ${pass + failures.length}:\n`);
  for (const f of failures) console.error(`  x ${f}\n`);
  process.exit(1);
}
console.log(`All ${pass} template/quick-reply checks passed.`);
