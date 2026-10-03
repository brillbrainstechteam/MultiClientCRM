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
import { templateFields } from '../crm/modules/contacts/imports/import-template';

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

// The exact header row our downloadable template produces.
const templateHeaders = templateFields.map((f) => f.label);
const templateMap = guessMapping(templateHeaders);
const templateTargets = new Set(Object.values(templateMap).filter(Boolean));
check('template: Name maps', templateTargets.has('name'));
check('template: Mobile maps', templateTargets.has('mobile'), JSON.stringify(templateMap));
const unmappedTemplate = templateHeaders.filter((h) => !templateMap[h]);
check('template: every column except Notes maps', unmappedTemplate.every((h) => h === 'Notes'), `unmapped: ${JSON.stringify(unmappedTemplate)}`);

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

check('unknown columns default to ignored', guessMapping(['Ledger Balance'])['Ledger Balance'] === '');

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

/* ---- summary -------------------------------------------------------------- */
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
