import { useSyncExternalStore } from 'react';
import type { ImportMethod } from '@crm/mock-data';
import { isScientificNotation, normMobile } from '@/lib/crm/mobile';

/**
 * State for one run of the Import Wizard.
 *
 * Each wizard step is its own route, so the container remounts on every
 * navigation — component state would be lost between "Source" and "Map
 * fields". This keeps the run in a module-level store (the same live-binding
 * idiom the CRM uses elsewhere) and exposes it through useSyncExternalStore.
 */

export type DuplicateStrategy = 'skip' | 'update';
export interface ImportResultCounts { created: number; updated: number; skipped: number }

export interface ImportJob {
  method: ImportMethod | null;
  fileName: string;
  /** Column headers as they appear in the uploaded file. */
  headers: string[];
  /** Raw rows, keyed by the file's own headers. */
  rows: Record<string, string>[];
  /** file header -> canonical contact field ('' means "don't import"). */
  mapping: Record<string, string>;
  onDuplicate: DuplicateStrategy;
  result: ImportResultCounts | null;
  error: string;
  busy: boolean;
}

const empty = (): ImportJob => ({
  method: null, fileName: '', headers: [], rows: [], mapping: {},
  onDuplicate: 'skip', result: null, error: '', busy: false,
});

let job: ImportJob = empty();
const listeners = new Set<() => void>();

const emit = () => { for (const l of listeners) l(); };

export function setJob(patch: Partial<ImportJob>): void {
  job = { ...job, ...patch };
  emit();
}

export function resetJob(method: ImportMethod | null = null): void {
  job = { ...empty(), method };
  emit();
}

export function getJob(): ImportJob {
  return job;
}

export function useImportJob(): ImportJob {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => job,
    () => job,
  );
}

/* ---- Field mapping ------------------------------------------------------ */

/** Fields the importer understands. Starred ones are required for a row to import. */
/** Sentinel mapping value: keep the column under the contact's customFields. */
export const CUSTOM_FIELD = '__custom';

export const TARGET_FIELDS: { value: string; label: string; required?: boolean }[] = [
  { value: 'name', label: 'Name *', required: true },
  { value: 'mobile', label: 'Mobile *', required: true },
  { value: 'company', label: 'Company' },
  { value: 'contactPerson', label: 'Contact person' },
  { value: 'email', label: 'Email' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'zone', label: 'Zone' },
  { value: 'pincode', label: 'Pincode' },
  { value: 'gstin', label: 'GSTIN' },
  { value: 'pan', label: 'PAN' },
  { value: 'website', label: 'Website' },
  { value: 'clientCode', label: 'Client code' },
  { value: 'source', label: 'Source' },
  { value: 'tags', label: 'Tags' },
  { value: 'grade', label: 'Grade (A/B/C/D)' },
  { value: 'businessSegment', label: 'Business segment' },
  { value: 'preferredLanguage', label: 'Preferred language' },
  { value: 'interestedIn', label: 'Interested in' },
  { value: 'dateOfBirth', label: 'Date of birth' },
  { value: 'companyAnniversary', label: 'Company anniversary' },
  { value: 'nextFollowUpAt', label: 'Next follow-up' },
  { value: 'customerType', label: 'Customer type (b2b/b2c)' },
  { value: CUSTOM_FIELD, label: 'Keep as custom field' },
];

const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Header spellings seen in real customer sheets, mapped to our field names. */
const ALIASES: Record<string, string> = {
  name: 'name', fullname: 'name', customername: 'name', partyname: 'name', firmname: 'name',
  mobile: 'mobile', mobileno: 'mobile', mobilenumber: 'mobile', phone: 'mobile', phoneno: 'mobile',
  contactno: 'mobile', contactnumber: 'mobile', whatsapp: 'mobile', whatsappnumber: 'mobile',
  // Our own downloaded template uses these exact labels — they must map, or the
  // first import a user tries stalls on the required-field check.
  whatsappmobile: 'mobile', whatsappno: 'mobile',
  company: 'company', companyname: 'company', shopname: 'company', businessname: 'company',
  contactperson: 'contactPerson', person: 'contactPerson', ownername: 'contactPerson',
  email: 'email', emailid: 'email', mailid: 'email',
  city: 'city', town: 'city', state: 'state', zone: 'zone', region: 'zone',
  pincode: 'pincode', pin: 'pincode', postalcode: 'pincode',
  gstin: 'gstin', gst: 'gstin', gstno: 'gstin', pan: 'pan', panno: 'pan',
  website: 'website', site: 'website', url: 'website',
  clientcode: 'clientCode', code: 'clientCode',
  source: 'source', leadsource: 'source', tags: 'tags', tag: 'tags',
  grade: 'grade', abcd: 'grade', gradeabcd: 'grade', category: 'grade',
  businesssegment: 'businessSegment', segment: 'businessSegment', contacttype: 'businessSegment',
  typeofcustomer: 'businessSegment', type: 'businessSegment',
  preferredlanguage: 'preferredLanguage', language: 'preferredLanguage',
  interestedin: 'interestedIn', enquiredcategory: 'interestedIn',
  dateofbirth: 'dateOfBirth', dob: 'dateOfBirth', birthday: 'dateOfBirth',
  companyanniversary: 'companyAnniversary', anniversary: 'companyAnniversary',
  nextfollowup: 'nextFollowUpAt', nextfollowupat: 'nextFollowUpAt', followup: 'nextFollowUpAt',
  customertype: 'customerType',
};

/* ---- Detecting a column from its data ----------------------------------- */

// 15 chars: 2 state digits + the 10-char PAN + entity code + 'Z' + checksum.
const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/i;
const PINCODE = /^[1-9]\d{5}$/;

/**
 * Work out what a column holds by looking at its values, for when the header
 * is unrecognised, missing, or in another language ("Column1", "मोबाइल").
 * Deterministic and free — no AI call. A column must be mostly consistent
 * before we claim it, so a stray value cannot mislabel a whole column.
 */
export function sniffColumn(values: string[]): string {
  const vals = values.map((v) => (v ?? '').trim()).filter(Boolean).slice(0, 50);
  if (vals.length < 2) return '';
  const share = (test: (v: string) => boolean) => vals.filter(test).length / vals.length;

  // Phone first: the most valuable column to get right.
  if (share((v) => Boolean(normMobile(v)) || isScientificNotation(v)) >= 0.8) return 'mobile';
  if (share((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) >= 0.8) return 'email';
  if (share((v) => GSTIN.test(v)) >= 0.8) return 'gstin';
  if (share((v) => PINCODE.test(v)) >= 0.8) return 'pincode';
  if (share((v) => /^(https?:\/\/|www\.)/i.test(v)) >= 0.8) return 'website';
  return '';
}

/* ---- Field mapping ------------------------------------------------------ */

/**
 * Best-guess mapping: match the header first, then fall back to reading the
 * column's values. Anything still unknown is kept as a custom field rather than
 * dropped — a client's own columns are usually the ones they care about.
 */
export function guessMapping(headers: string[], rows: Record<string, string>[] = []): Record<string, string> {
  const used = new Set<string>();
  const out: Record<string, string> = {};

  // Pass 1: headers we recognise outright. A trailing number is dropped on the
  // second try, so "Tag 1" / "Phone 2" match the same alias as "Tag" / "Phone".
  for (const h of headers) {
    const k = key(h);
    const guess = ALIASES[k] ?? ALIASES[k.replace(/\d+$/, '')];
    // tags is the one field several columns may share (Tag 1, Tag 2, …).
    if (guess && (guess === 'tags' || !used.has(guess))) { out[h] = guess; used.add(guess); }
    else out[h] = '';
  }

  // Pass 2: unclaimed columns judged by their contents.
  for (const h of headers) {
    if (out[h]) continue;
    const sniffed = sniffColumn(rows.map((r) => r[h] ?? ''));
    if (sniffed && !used.has(sniffed)) { out[h] = sniffed; used.add(sniffed); }
  }

  // Pass 3: keep the rest, rather than silently discarding the client's data.
  for (const h of headers) if (!out[h]) out[h] = CUSTOM_FIELD;

  return out;
}

/** Apply the mapping, producing rows keyed by canonical field names. */
export function mappedRows(j: ImportJob): Record<string, unknown>[] {
  const pairs = Object.entries(j.mapping).filter(([, field]) => field);
  return j.rows.map((row) => {
    const out: Record<string, unknown> = {};
    const custom: Record<string, string> = {};
    for (const [header, field] of pairs) {
      const v = (row[header] ?? '').trim();
      if (!v) continue;
      if (field === CUSTOM_FIELD) custom[header] = v;
      // Several tag columns combine into one cell the importer then splits.
      else if (field === 'tags') out.tags = out.tags ? `${out.tags};${v}` : v;
      else out[field] = v;
    }
    if (Object.keys(custom).length) out.customFields = custom;
    return out;
  });
}

export interface RowIssues {
  total: number;
  importable: number;
  missingName: number;
  missingMobile: number;
  mangledMobile: number;
  duplicateInFile: number;
}

/**
 * What the importer will do with these rows — mirrors its own skip rules, using
 * the same normaliser, so the preview cannot promise more than the server does.
 */
export function validateRows(rows: Record<string, unknown>[]): RowIssues {
  const seen = new Set<string>();
  let missingName = 0, missingMobile = 0, mangledMobile = 0, duplicateInFile = 0, importable = 0;
  for (const r of rows) {
    const name = String(r.name ?? '').trim();
    const raw = String(r.mobile ?? '').trim();
    const mobile = normMobile(raw);
    if (!name) { missingName++; continue; }
    if (!mobile) {
      // Separated out because the fix differs: re-export the column as Text.
      if (isScientificNotation(raw)) mangledMobile++;
      else missingMobile++;
      continue;
    }
    if (seen.has(mobile)) { duplicateInFile++; continue; }
    seen.add(mobile);
    importable++;
  }
  return { total: rows.length, importable, missingName, missingMobile, mangledMobile, duplicateInFile };
}
