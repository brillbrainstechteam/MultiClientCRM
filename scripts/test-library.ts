/**
 * Communication Library tests.
 *
 * Run: npx tsx scripts/test-library.ts
 *
 * The matrix is the whole point of §17's last line, "only show formats
 * supported by the destination", and every entry in it is a Meta constraint
 * rather than a preference. Get one wrong and an agent picks content that
 * cannot be sent — the failure arrives as an API error long after the choice,
 * which is exactly the experience the library exists to prevent.
 *
 * Pure functions — no database, no network.
 */
import {
  canUse, destinationsFor, usableAt, isComplete, fillPlaceholders, placeholdersIn,
  type LibraryItemShape,
} from '../lib/crm/library';

let pass = 0;
const failures: string[] = [];

function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; return; }
  failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

const item = (over: Partial<LibraryItemShape> & { kind: string }): LibraryItemShape => ({
  body: 'hello', fileId: 'f1', linkUrl: null, templateId: null, catalogueItemIds: [], ...over,
});

/* ---- Live 1:1 takes everything we hold ------------------------------------- */

for (const kind of ['text', 'image', 'video', 'audio', 'document', 'link', 'catalogue', 'template']) {
  check(`${kind} works in a live chat`,
    canUse(item({ kind, templateId: kind === 'template' ? 't1' : null }), 'one_to_one_live').ok, true);
}

/* ---- Outside the window, only an approved template -------------------------- */

// The constraint that matters most: a voice note has no template form at all,
// because WhatsApp template headers are text, image, video or document.
check('a voice note cannot be a template message',
  canUse(item({ kind: 'audio' }), 'one_to_one_template').ok, false);
check('and the reason says what to do instead',
  canUse(item({ kind: 'audio' }), 'one_to_one_template').reason?.includes('live chat'), true);
check('nor can it be a campaign',
  canUse(item({ kind: 'audio' }), 'campaign').ok, false);

check('plain text is not deliverable outside the window',
  canUse(item({ kind: 'text' }), 'one_to_one_template').ok, false);
check('an image on its own is not either',
  canUse(item({ kind: 'image' }), 'campaign').ok, false);

// ...but anything pointing at an approved template is, whatever its own kind,
// because the template is what gets sent.
check('an item linked to an approved template can be a campaign',
  canUse(item({ kind: 'image', templateId: 'tpl_1' }), 'campaign').ok, true);
check('a template item is fine outside the window',
  canUse(item({ kind: 'template', templateId: 'tpl_1' }), 'one_to_one_template').ok, true);

check('a catalogue is not template content',
  canUse(item({ kind: 'catalogue', catalogueItemIds: ['p1'] }), 'campaign').ok, false);

/* ---- Managed groups --------------------------------------------------------- */

check('text works in a managed group',
  canUse(item({ kind: 'text' }), 'managed_group').ok, true);
check('so does media',
  canUse(item({ kind: 'video' }), 'managed_group').ok, true);
// §9.3: commerce/product messages are not supported in groups.
check('a catalogue cannot go to a group',
  canUse(item({ kind: 'catalogue', catalogueItemIds: ['p1'] }), 'managed_group').ok, false);
check('and the reason names the real limit',
  canUse(item({ kind: 'catalogue' }), 'managed_group').reason?.includes('groups'), true);

/* ---- External groups: nothing is sent, so nothing is forbidden -------------- */

for (const kind of ['audio', 'catalogue', 'text', 'video']) {
  check(`${kind} is allowed for an external group`,
    canUse(item({ kind }), 'external_group_manual').ok, true);
}
// But it must be marked manual, so no report ever counts it as delivery.
check('external group use is flagged as manual, not delivery',
  canUse(item({ kind: 'text' }), 'external_group_manual').manual, true);
check('and a live send is not flagged manual',
  canUse(item({ kind: 'text' }), 'one_to_one_live').manual, undefined);

/* ---- Where an item can go --------------------------------------------------- */

check('a voice note is live chat and external groups only',
  destinationsFor(item({ kind: 'audio' })),
  ['one_to_one_live', 'managed_group', 'external_group_manual']);

check('a template reaches every destination',
  destinationsFor(item({ kind: 'template', templateId: 't1' })).length, 5);

check('a catalogue is live chat and manual only',
  destinationsFor(item({ kind: 'catalogue', catalogueItemIds: ['p1'] })),
  ['one_to_one_live', 'external_group_manual']);

/* ---- Narrowing a library ----------------------------------------------------- */

const library = [
  item({ kind: 'text' }),
  item({ kind: 'audio' }),
  item({ kind: 'template', templateId: 't1' }),
  item({ kind: 'catalogue', catalogueItemIds: ['p1'] }),
];

// This is what the composer calls. An agent sending a campaign must not be
// shown the voice note at all.
check('a campaign picker shows only the template',
  usableAt(library, 'campaign').map((i) => i.kind), ['template']);
check('a live chat picker shows everything',
  usableAt(library, 'one_to_one_live').length, 4);
check('a group picker hides the catalogue',
  usableAt(library, 'managed_group').map((i) => i.kind), ['text', 'audio', 'template']);

/* ---- Completeness ------------------------------------------------------------ */

// The two ways a library entry looks fine in a list and fails when picked.
check('an image with no file is incomplete',
  isComplete({ kind: 'image', fileId: null }).ok, false);
check('a link with no url is incomplete',
  isComplete({ kind: 'link', linkUrl: '' }).ok, false);
check('a message with no text is incomplete',
  isComplete({ kind: 'text', body: '   ' }).ok, false);
check('a template item with no template is incomplete',
  isComplete({ kind: 'template', templateId: null }).ok, false);
check('a catalogue item with no products is incomplete',
  isComplete({ kind: 'catalogue', catalogueItemIds: [] }).ok, false);
check('a complete image passes', isComplete({ kind: 'image', fileId: 'f1' }).ok, true);
check('and says what is missing',
  isComplete({ kind: 'image', fileId: null }).reason, 'Upload the file.');

/* ---- Placeholders -------------------------------------------------------------- */

check('named placeholders are filled',
  fillPlaceholders('Hi {{name}}, your {{item}} is ready', { name: 'Rahul', item: 'bangle' }),
  'Hi Rahul, your bangle is ready');
check('spacing inside the braces is tolerated',
  fillPlaceholders('Hi {{ name }}', { name: 'Priya' }), 'Hi Priya');

// "Hi " going out looks deliberate; "Hi {{name}}" is obviously a mistake and
// gets caught before sending.
check('an unknown placeholder is left visible rather than blanked',
  fillPlaceholders('Hi {{name}}', {}), 'Hi {{name}}');
check('an empty value is treated as missing, not as a blank',
  fillPlaceholders('Hi {{name}}', { name: '' }), 'Hi {{name}}');

check('placeholders are listed for the UI',
  placeholdersIn('Hi {{name}}, about {{item}} and {{name}} again'), ['name', 'item']);
check('a body with none returns none', placeholdersIn('Plain message'), []);

/* ---- Report --------------------------------------------------------------------- */

if (failures.length) {
  console.error(`\n${failures.length} FAILED of ${pass + failures.length}:\n`);
  for (const f of failures) console.error(`  x ${f}\n`);
  process.exit(1);
}
console.log(`All ${pass} library checks passed.`);
