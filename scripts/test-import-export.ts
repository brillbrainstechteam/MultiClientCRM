/**
 * Import/export checks for the Contacts module.
 *
 *   npx tsx scripts/test-import-export.ts
 *
 * Covers the pure logic every import path runs through: CSV parsing, header
 * mapping, the validation that decides what gets skipped, and the vCard
 * round-trip. Server-side writes are not exercised here — those need a
 * database — so this is about the client half being correct before it POSTs.
 */
import { parseCsv } from '../crm/app/crm-data';
import { parseVcf, buildVcf } from '../crm/modules/contacts/vcf';
import {
  guessMapping,
  mappedRows,
  validateRows,
  type ImportJob,
} from '../crm/modules/contacts/imports/import-job-store';
import { buildTemplateCsv } from '../crm/modules/contacts/imports/import-template';
import { normMobile, isScientificNotation } from '../lib/crm/mobile';
import { parseTags, mergeTags } from '../lib/crm/tags';
import { sniffColumn, CUSTOM_FIELD } from '../crm/modules/contacts/imports/import-job-store';

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail = '') {
  if (condition) { passed++; console.log(`  PASS  ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ''}`); console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

function section(title: string) { console.log(`\n${title}`); }

/** Build a job the way the wizard does, so tests exercise the real path. */
function jobFrom(rows: Record<string, string>[]): ImportJob {
  const headers = Object.keys(rows[0] ?? {});
  return {
    method: 'csv', fileName: 'test.csv', headers, rows,
    mapping: guessMapping(headers), onDuplicate: 'skip',
    result: null, error: '', busy: false,
  };
}

/* ---- 1. CSV parsing ------------------------------------------------------ */
section('CSV parsing');

const basic = parseCsv('name,mobile\nRahul,9810011234\nPriya,9820022345\n');
check('parses header + rows', basic.length === 2, `got ${basic.length}`);
check('reads values by header', basic[0]?.mobile === '9810011234', JSON.stringify(basic[0]));

const quoted = parseCsv('name,company\n"Shah, Rahul","Aurelia Jewellers, Pvt Ltd"\n');
check('quoted field containing a comma', quoted[0]?.name === 'Shah, Rahul', JSON.stringify(quoted[0]));
check('second quoted field intact', quoted[0]?.company === 'Aurelia Jewellers, Pvt Ltd');

const escaped = parseCsv('name,note\n"He said ""hi""",ok\n');
check('escaped double quotes', escaped[0]?.name === 'He said "hi"', JSON.stringify(escaped[0]));

const crlf = parseCsv('name,mobile\r\nRahul,9810011234\r\n');
check('CRLF line endings', crlf.length === 1 && crlf[0]?.mobile === '9810011234');

const blanks = parseCsv('name,mobile\nRahul,9810011234\n\n\n');
check('ignores trailing blank lines', blanks.length === 1, `got ${blanks.length}`);

// Excel saves CSVs with a UTF-8 BOM; it must not corrupt the first column.
const bom = parseCsv('﻿name,mobile\nRahul,9810011234\n');
const bomKeys = Object.keys(bom[0] ?? {});
check('BOM does not break the first header', bomKeys.some((k) => k.replace(/[^a-z0-9]/gi, '') === 'name'), `headers: ${JSON.stringify(bomKeys)}`);

/* ---- 2. Header mapping --------------------------------------------------- */
section('Header mapping');

// Parse the real downloadable template, asterisks and all.
const templateRows = parseCsv(buildTemplateCsv());
const templateHeaders = Object.keys(templateRows[0] ?? {});
const templateMap = guessMapping(templateHeaders, templateRows);
const templateTargets = new Set(Object.values(templateMap).filter(Boolean));
check('template: Name maps', templateTargets.has('name'));
check('template: Mobile maps', templateTargets.has('mobile'), JSON.stringify(templateMap));
const unmappedTemplate = templateHeaders.filter((h) => !templateMap[h] || templateMap[h] === CUSTOM_FIELD);
check('template: every column except Notes maps to a field', unmappedTemplate.every((h) => /notes/i.test(h)), `unmapped: ${JSON.stringify(unmappedTemplate)}`);

// Headers as they actually appear in customer sheets.
const messy = guessMapping(['Party Name', 'Mobile No.', 'Shop Name', 'E-mail ID', 'City', 'GST No', 'Next Follow Up']);
check('messy: Party Name -> name', messy['Party Name'] === 'name');
check('messy: Mobile No. -> mobile', messy['Mobile No.'] === 'mobile');
check('messy: Shop Name -> company', messy['Shop Name'] === 'company');
check('messy: E-mail ID -> email', messy['E-mail ID'] === 'email');
check('messy: GST No -> gstin', messy['GST No'] === 'gstin');
check('messy: Next Follow Up -> nextFollowUpAt', messy['Next Follow Up'] === 'nextFollowUpAt');

// Two columns that both look like a mobile must not both claim the field.
const collide = guessMapping(['Mobile', 'Phone', 'Name']);
const mobileClaims = Object.values(collide).filter((v) => v === 'mobile').length;
check('no two columns claim the same field', mobileClaims === 1, JSON.stringify(collide));

check('unknown columns are kept as custom, not dropped', guessMapping(['Ledger Balance'])['Ledger Balance'] === CUSTOM_FIELD);

/* ---- 3. Mapping + validation --------------------------------------------- */
section('Row mapping and validation');

const rows = parseCsv([
  'Full Name,WhatsApp Mobile,City',
  'Rahul Shah,9810011234,Gurugram',
  'Priya Mehta,9820022345,Mumbai',
  ',9830033456,Delhi',            // no name -> skipped
  'Arun Kumar,,Chennai',          // no mobile -> skipped
  'Rahul Again,9810011234,Pune',  // duplicate mobile -> skipped
].join('\n'));

const job = jobFrom(rows);
const mapped = mappedRows(job);
check('mapped rows use canonical field names', mapped[0]?.name === 'Rahul Shah' && mapped[0]?.mobile === '9810011234', JSON.stringify(mapped[0]));
check('unmapped columns are dropped', !('Full Name' in (mapped[0] ?? {})));

const issues = validateRows(mapped);
check('counts total rows', issues.total === 5, `got ${issues.total}`);
check('importable excludes bad rows', issues.importable === 2, `got ${issues.importable}`);
check('flags the row with no name', issues.missingName === 1, `got ${issues.missingName}`);
check('flags the row with no mobile', issues.missingMobile === 1, `got ${issues.missingMobile}`);
check('flags the in-file duplicate', issues.duplicateInFile === 1, `got ${issues.duplicateInFile}`);
check('every row is accounted for',
  issues.importable + issues.missingName + issues.missingMobile + issues.duplicateInFile === issues.total);

// Blank cells must not produce empty-string fields the importer would store.
const sparse = mappedRows(jobFrom(parseCsv('Full Name,WhatsApp Mobile,City\nRahul,9810011234,\n')));
check('blank cells are omitted, not stored as ""', !('city' in (sparse[0] ?? {})), JSON.stringify(sparse[0]));

/* ---- 4. vCard round-trip -------------------------------------------------- */
section('vCard import/export');

const contacts = [
  { name: 'Rahul Shah', company: 'Aurelia Jewellers', contactPerson: 'Rahul', mobile: '+919810011234', email: 'rahul@example.com', city: 'Gurugram' },
  { name: 'Priya, Mehta', company: 'Mehta & Sons; Jaipur', contactPerson: '', mobile: '+919820022345', email: '', city: 'Mumbai' },
];
const vcf = buildVcf(contacts);
check('export produces vCard cards', (vcf.match(/BEGIN:VCARD/g) ?? []).length === 2, vcf.slice(0, 80));

const reparsed = parseVcf(vcf);
check('round-trip keeps every contact', reparsed.length === 2, `got ${reparsed.length}`);
check('round-trip keeps the name', reparsed[0]?.name === 'Rahul Shah', JSON.stringify(reparsed[0]));
check('round-trip keeps the mobile', reparsed[0]?.mobile?.replace(/\D/g, '') === '919810011234', JSON.stringify(reparsed[0]));
check('comma in a name survives the round-trip', reparsed[1]?.name === 'Priya, Mehta', JSON.stringify(reparsed[1]));
// The worse failure: a semicolon in ORG used to truncate everything after it.
check('semicolon in a company survives the round-trip', reparsed[1]?.company === 'Mehta & Sons; Jaipur', JSON.stringify(reparsed[1]));

// A card as a phone actually exports it: folded lines, typed TEL, extra fields.
const phoneCard = [
  'BEGIN:VCARD', 'VERSION:3.0',
  'FN:Suresh Kumar',
  'ORG:Kumar Gold Palace',
  'TEL;TYPE=CELL:+91 98200 11223',
  'TEL;TYPE=WORK:022 2345 6789',
  'EMAIL;TYPE=INTERNET:suresh@example.com',
  'ADR;TYPE=HOME:;;12 MG Road;Pune;MH;411001;India',
  'END:VCARD',
].join('\r\n');
const phone = parseVcf(phoneCard);
check('parses a phone-exported card', phone.length === 1, `got ${phone.length}`);
check('reads FN as the name', phone[0]?.name === 'Suresh Kumar', JSON.stringify(phone[0]));
check('prefers the mobile TEL', (phone[0]?.mobile ?? '').replace(/\D/g, '').endsWith('9820011223'), JSON.stringify(phone[0]));

/* ---- 5. Mobile normalisation --------------------------------------------- */
section('Mobile numbers');

check('plain 10-digit gets +91', normMobile('9810011234') === '+919810011234');
check('spaces and dashes are stripped', normMobile('98100-11234') === '+919810011234');
check('+91 with spaces normalises', normMobile('+91 98100 11234') === '+919810011234', normMobile('+91 98100 11234'));
check('country code already present', normMobile('919810011234') === '+919810011234');
check('trunk zero dropped', normMobile('09810011234') === '+919810011234');
check('spreadsheet .0 suffix dropped', normMobile('9810011234.0') === '+919810011234', normMobile('9810011234.0'));
check('too short is rejected', normMobile('12345') === '');
check('empty is rejected', normMobile('') === '');
// Excel destroys the digits, so importing a rounded value would text a stranger.
check('scientific notation is detected', isScientificNotation('9.81001E+09'));
check('scientific notation is refused, not guessed', normMobile('9.81001E+09') === '', normMobile('9.81001E+09'));
check('two formats of one number dedupe to the same value',
  normMobile('+91 98100 11234') === normMobile('9810011234'));

/* ---- 6. Column sniffing --------------------------------------------------- */
section('Detecting columns from their data');

check('detects a mobile column', sniffColumn(['9810011234', '9820022345', '9830033456']) === 'mobile');
check('detects an email column', sniffColumn(['a@b.com', 'c@d.in']) === 'email');
check('detects a pincode column', sniffColumn(['122001', '400001', '560001']) === 'pincode');
check('detects a GSTIN column', sniffColumn(['06ABCDE1234F1Z5', '27ABCDE1234F1Z5']) === 'gstin');
check('detects a website column', sniffColumn(['www.a.com', 'https://b.in']) === 'website');
check('does not guess from names', sniffColumn(['Rahul Shah', 'Priya Mehta']) === '');
check('ignores a column of one value', sniffColumn(['9810011234']) === '');

// A file with useless headers must still import — this is the whole point.
const junk = parseCsv([
  'Column1,Column2,Column3',
  'Rahul Shah,9810011234,rahul@example.com',
  'Priya Mehta,9820022345,priya@example.com',
].join('\n'));
const junkMap = guessMapping(Object.keys(junk[0]), junk);
check('headerless file: mobile found by data', Object.values(junkMap).includes('mobile'), JSON.stringify(junkMap));
check('headerless file: email found by data', Object.values(junkMap).includes('email'), JSON.stringify(junkMap));

/* ---- 7. Custom columns ---------------------------------------------------- */
section('Custom columns');

const withCustom = parseCsv(['Full Name*,WhatsApp Mobile*,Ledger Balance', 'Rahul,9810011234,15000'].join('\n'));
const customJob = jobFrom(withCustom);
const customMapped = mappedRows(customJob);
const kept = customMapped[0]?.customFields as Record<string, string> | undefined;
check('unmapped column is kept as a custom field', Boolean(kept), JSON.stringify(customMapped[0]));
check('custom value survives', kept?.['Ledger Balance'] === '15000', JSON.stringify(kept));
check('custom column does not pollute real fields', !('Ledger Balance' in (customMapped[0] ?? {})));

/* ---- 8. Tags ------------------------------------------------------------- */
section('Tags');

check('semicolon separated', JSON.stringify(parseTags('bulk-buyer; festive')) === JSON.stringify(['bulk-buyer', 'festive']));
check('comma separated (what people actually type)', JSON.stringify(parseTags('bulk-buyer, festive')) === JSON.stringify(['bulk-buyer', 'festive']), JSON.stringify(parseTags('bulk-buyer, festive')));
check('pipe separated', JSON.stringify(parseTags('a|b')) === JSON.stringify(['a', 'b']));
check('mixed separators', JSON.stringify(parseTags('a, b; c|d')) === JSON.stringify(['a', 'b', 'c', 'd']));
check('blanks and spacing dropped', JSON.stringify(parseTags(' a ,, b ')) === JSON.stringify(['a', 'b']));
check('case-insensitive de-dupe keeps first spelling', JSON.stringify(parseTags('VIP, vip, Vip')) === JSON.stringify(['VIP']), JSON.stringify(parseTags('VIP, vip, Vip')));
check('empty cell gives no tags', parseTags('').length === 0);

check('update merges instead of replacing', JSON.stringify(mergeTags(['existing'], ['new'])) === JSON.stringify(['existing', 'new']));
check('merge does not duplicate', JSON.stringify(mergeTags(['VIP'], ['vip', 'bulk'])) === JSON.stringify(['VIP', 'bulk']), JSON.stringify(mergeTags(['VIP'], ['vip', 'bulk'])));

// A quoted cell holding commas is one CSV field, then several tags.
const tagRows = parseCsv(['Full Name*,WhatsApp Mobile*,Tags', 'Rahul,9810011234,"bulk-buyer, festive-2026"'].join(String.fromCharCode(10)));
const tagMapped = mappedRows(jobFrom(tagRows));
check('quoted multi-tag cell stays one column', String(tagMapped[0]?.tags ?? '').includes('bulk-buyer'), JSON.stringify(tagMapped[0]));
check('and yields several tags', parseTags(tagMapped[0]?.tags).length === 2, JSON.stringify(parseTags(tagMapped[0]?.tags)));

// Clients often spread tags across columns instead of one cell.
const multiCol = parseCsv(['Full Name*,WhatsApp Mobile*,Tag 1,Tag 2', 'Rahul,9810011234,vip,north-zone'].join(String.fromCharCode(10)));
const multiJob = jobFrom(multiCol);
const multiMapped = mappedRows(multiJob);
check('two tag columns both map to tags', Object.values(multiJob.mapping).filter((v) => v === 'tags').length === 2, JSON.stringify(multiJob.mapping));
check('both columns end up as tags', parseTags(multiMapped[0]?.tags).length === 2, JSON.stringify(multiMapped[0]));

/* ---- summary -------------------------------------------------------------- */
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
