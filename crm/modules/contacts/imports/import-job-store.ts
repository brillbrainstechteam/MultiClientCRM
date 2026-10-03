import { useSyncExternalStore } from 'react';
import type { ImportMethod } from '@crm/mock-data';

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

/** Best-guess mapping for a file's headers; unknown columns default to ignored. */
export function guessMapping(headers: string[]): Record<string, string> {
  const used = new Set<string>();
  const out: Record<string, string> = {};
  for (const h of headers) {
    const guess = ALIASES[key(h)];
    if (guess && !used.has(guess)) { out[h] = guess; used.add(guess); }
    else out[h] = '';
  }
  return out;
}

/** Apply the mapping, producing rows keyed by canonical field names. */
export function mappedRows(j: ImportJob): Record<string, string>[] {
  const pairs = Object.entries(j.mapping).filter(([, field]) => field);
  return j.rows.map((row) => {
    const out: Record<string, string> = {};
    for (const [header, field] of pairs) {
      const v = (row[header] ?? '').trim();
      if (v) out[field] = v;
    }
    return out;
  });
}

export interface RowIssues {
  total: number;
  importable: number;
  missingName: number;
  missingMobile: number;
  duplicateInFile: number;
}

/** What the importer will do with these rows — mirrors its own skip rules. */
export function validateRows(rows: Record<string, string>[]): RowIssues {
  const seen = new Set<string>();
  let missingName = 0, missingMobile = 0, duplicateInFile = 0, importable = 0;
  for (const r of rows) {
    const name = (r.name ?? '').trim();
    const mobile = (r.mobile ?? '').replace(/\D/g, '');
    if (!name) { missingName++; continue; }
    if (!mobile) { missingMobile++; continue; }
    if (seen.has(mobile)) { duplicateInFile++; continue; }
    seen.add(mobile);
    importable++;
  }
  return { total: rows.length, importable, missingName, missingMobile, duplicateInFile };
}
