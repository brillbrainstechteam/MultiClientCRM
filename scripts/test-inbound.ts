/**
 * Inbound message rendering tests.
 *
 * Run: npx tsx scripts/test-inbound.ts
 *
 * Every message type that is not plain text used to land in the thread as
 * "[location]" or "[contacts]" — accurate and useless. An agent seeing
 * "[location]" cannot tell whether the customer sent a shop address or asked to
 * meet somewhere; "[order]" hides what they wanted to buy.
 *
 * Payload shapes are Meta's. Pure functions, no database or network.
 */
import { describeInbound } from '../lib/whatsapp/inbound';
import { isMediaType, sendTypeFor, mediaPlaceholderText } from '../lib/whatsapp/media';

let pass = 0;
const failures: string[] = [];

function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; return; }
  failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

/* ---- Text ----------------------------------------------------------------- */

check('plain text passes through',
  describeInbound({ type: 'text', text: { body: 'Do you have 22k bangles?' } }).text,
  'Do you have 22k bangles?');
check('empty text does not crash', describeInbound({ type: 'text' }).text, '');

/* ---- Media: the caption IS the message ------------------------------------ */

const photo = describeInbound({
  type: 'image',
  image: { id: 'MEDIA123', mime_type: 'image/jpeg', caption: 'Can you make this in rose gold?' },
});
check('a captioned photo reads as its caption', photo.text, 'Can you make this in rose gold?');
check('and yields the media id to fetch', photo.mediaId, 'MEDIA123');

check('an uncaptioned photo still says what it is',
  describeInbound({ type: 'image', image: { id: 'M1' } }).text, 'Photo');
check('a document prefers its filename',
  describeInbound({ type: 'document', document: { id: 'M2', filename: 'quote.pdf' } }).text,
  'Document: quote.pdf');
check('and exposes the filename for storage',
  describeInbound({ type: 'document', document: { id: 'M2', filename: 'quote.pdf' } }).fileName,
  'quote.pdf');
check('a voice note is named as one',
  describeInbound({ type: 'audio', audio: { id: 'M3', voice: true } }).text, 'Voice message');
check('a sticker is named', describeInbound({ type: 'sticker', sticker: { id: 'M4' } }).text, 'Sticker');

/* ---- Location: the whole point is where ----------------------------------- */

const namedLoc = describeInbound({
  type: 'location',
  location: { latitude: 26.9124, longitude: 75.7873, name: 'Johari Bazaar', address: 'Jaipur' },
});
check('a named location says where', namedLoc.text, 'Location: Johari Bazaar, Jaipur');
check('and keeps the coordinates', [namedLoc.latitude, namedLoc.longitude], [26.9124, 75.7873]);
check('a bare location falls back to coordinates',
  describeInbound({ type: 'location', location: { latitude: 26.9124, longitude: 75.7873 } }).text,
  'Location: 26.91240, 75.78730');
check('a location with nothing usable still reads',
  describeInbound({ type: 'location', location: {} }).text, 'Location shared');

/* ---- Shared contacts — the number is the actionable part ------------------ */

check('a shared contact names them and their number',
  describeInbound({
    type: 'contacts',
    contacts: [{ name: { formatted_name: 'Rahul Shah' }, phones: [{ phone: '+919820011122' }] }],
  }).text,
  'Shared contact: Rahul Shah (+919820011122)');
check('several contacts are listed',
  describeInbound({
    type: 'contacts',
    contacts: [
      { name: { formatted_name: 'A' }, phones: [] },
      { name: { formatted_name: 'B' }, phones: [] },
    ],
  }).text,
  'Shared contact: A, B');
check('a contact with only a number still reads',
  describeInbound({ type: 'contacts', contacts: [{ phones: [{ phone: '+9198200' }] }] }).text,
  'Shared contact: +9198200');
check('an empty contacts payload degrades',
  describeInbound({ type: 'contacts', contacts: [] }).text, 'Contact shared');

/* ---- Taps ------------------------------------------------------------------ */

check('a template button tap shows the label',
  describeInbound({ type: 'button', button: { text: 'Yes, keep me updated' } }).text,
  'Tapped: Yes, keep me updated');
check('an interactive button reply shows its title',
  describeInbound({ type: 'interactive', interactive: { button_reply: { id: 'x', title: 'Book a visit' } } }).text,
  'Chose: Book a visit');
check('a list reply shows its title',
  describeInbound({ type: 'interactive', interactive: { list_reply: { id: 'y', title: 'Gold rate' } } }).text,
  'Chose: Gold rate');

/* ---- Reactions -------------------------------------------------------------- */

check('a reaction shows the emoji',
  describeInbound({ type: 'reaction', reaction: { emoji: '❤️', message_id: 'wamid.x' } }).text,
  'Reacted ❤️');
check('an empty emoji means it was removed',
  describeInbound({ type: 'reaction', reaction: { emoji: '', message_id: 'wamid.x' } }).text,
  'Removed a reaction');

/* ---- Orders ------------------------------------------------------------------ */

check('an order summarises items and value',
  describeInbound({
    type: 'order',
    order: {
      product_items: [
        { item_price: 38500, quantity: 1, currency: 'INR' },
        { item_price: 12000, quantity: 2, currency: 'INR' },
      ],
    },
  }).text,
  'Order: 2 items — INR 62,500');
check('an empty order still reads',
  describeInbound({ type: 'order', order: { product_items: [] } }).text, 'Order placed');

/* ---- Failure modes ----------------------------------------------------------- */

check('an unsupported message carries the reason',
  describeInbound({ type: 'unsupported', errors: [{ title: 'Message type is not currently supported' }] }).text,
  'Unsupported message — Message type is not currently supported');
check('a system message shows its body',
  describeInbound({ type: 'system', system: { body: 'Customer changed their phone number' } }).text,
  'Customer changed their phone number');
check('an unknown type is named rather than hidden',
  describeInbound({ type: 'quantum_telepathy' }).text, 'Unrecognised message (quantum_telepathy)');
check('a missing type does not crash', describeInbound({}).text, '');

/* ---- Media helpers ------------------------------------------------------------ */

check('image is a media type', isMediaType('image'), true);
check('document is a media type', isMediaType('document'), true);
check('text is not', isMediaType('text'), false);
check('undefined is not', isMediaType(undefined), false);

check('images send as image', sendTypeFor('image/jpeg'), 'image');
check('video sends as video', sendTypeFor('video/mp4'), 'video');
check('audio sends as audio', sendTypeFor('audio/ogg'), 'audio');
check('a PDF sends as a document', sendTypeFor('application/pdf'), 'document');
check('anything unknown sends as a document', sendTypeFor('application/x-weird'), 'document');

check('a placeholder names the type', mediaPlaceholderText('image'), 'Photo');
check('and includes a filename when there is one',
  mediaPlaceholderText('document', 'quote.pdf'), 'Document: quote.pdf');

/* ---- Report --------------------------------------------------------------------- */

if (failures.length) {
  console.error(`\n${failures.length} FAILED of ${pass + failures.length}:\n`);
  for (const f of failures) console.error(`  x ${f}\n`);
  process.exit(1);
}
console.log(`All ${pass} inbound-rendering checks passed.`);
