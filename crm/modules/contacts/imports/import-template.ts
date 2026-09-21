/**
 * Canonical contact import template (Contacts requirement §1/§2).
 *
 * One field structure is shared by every template surface — the Imports & Sync
 * hub, the CSV/Excel upload step, and the Google Sheets template — so a file
 * prepared from any of them maps identically. Mandatory fields are marked; city
 * and state drive zone-based assignment and are strongly recommended.
 */

export interface TemplateField {
  key: string;
  label: string;
  required: boolean;
  example: string;
  help: string;
}

export const templateFields: TemplateField[] = [
  { key: 'name', label: 'Full Name', required: true, example: 'Rahul Shah', help: 'Contact display name.' },
  { key: 'mobile', label: 'WhatsApp Mobile', required: true, example: '9810011234', help: '10-digit or +91 format; used as the identity key.' },
  { key: 'email', label: 'Email', required: false, example: 'rahul@shahtextiles.example', help: 'Optional.' },
  { key: 'company', label: 'Company', required: false, example: 'Aurelia Jewellers', help: 'Business/firm name (B2B).' },
  { key: 'contactPerson', label: 'Contact Person', required: false, example: 'Rahul Shah', help: 'Primary person at the firm (B2B).' },
  { key: 'city', label: 'City', required: false, example: 'Gurugram', help: 'Used for zone routing — recommended.' },
  { key: 'state', label: 'State', required: false, example: 'Haryana', help: 'Used for zone routing when city is unknown.' },
  { key: 'zone', label: 'Zone', required: false, example: 'North', help: 'Sales zone.' },
  { key: 'pincode', label: 'Pincode', required: false, example: '122001', help: 'Optional.' },
  { key: 'businessSegment', label: 'Segment', required: false, example: 'Chain of stores', help: 'Chain of stores / Corporate / Boutique / Exports / Standalone / Small.' },
  { key: 'grade', label: 'Grade (ABCD)', required: false, example: 'A', help: 'Customer grade A / B / C / D.' },
  { key: 'preferredLanguage', label: 'Preferred Language', required: false, example: 'Hindi', help: 'Language for templates/agents.' },
  { key: 'website', label: 'Website', required: false, example: 'aureliajewellers.example', help: 'Optional.' },
  { key: 'gstin', label: 'GSTIN', required: false, example: '06ABCDE1234F1Z5', help: 'Optional (B2B).' },
  { key: 'pan', label: 'PAN', required: false, example: 'ABCDE1234F', help: 'Optional (B2B).' },
  { key: 'clientCode', label: 'Client Code', required: false, example: 'AUR-0142', help: 'Your internal client code.' },
  { key: 'dateOfBirth', label: 'Birthday', required: false, example: '1985-04-12', help: 'YYYY-MM-DD — powers birthday wishes/offers.' },
  { key: 'companyAnniversary', label: 'Company Anniversary', required: false, example: '2004-11-20', help: 'YYYY-MM-DD — powers anniversary wishes/offers.' },
  { key: 'nextFollowUpAt', label: 'Next Follow-up', required: false, example: '2026-10-05', help: 'YYYY-MM-DD — appears in the follow-up queue.' },
  { key: 'interestedIn', label: 'Interested In', required: false, example: 'Antique bridal sets', help: 'What the client is looking for.' },
  { key: 'tags', label: 'Tags', required: false, example: 'bulk-buyer; festive-2026', help: 'Separate multiple tags with a semicolon.' },
  { key: 'source', label: 'Source', required: false, example: 'Exhibition — GJS', help: 'Where the contact came from.' },
  { key: 'notes', label: 'Notes', required: false, example: 'Met at GJS April; wants antique kada designs', help: 'Free text.' },
];

/** Header cell text — mandatory fields carry a trailing asterisk. */
function headerLabels(): string[] {
  return templateFields.map((f) => (f.required ? `${f.label}*` : f.label));
}

const SAMPLE_ROWS: string[][] = [
  // name, mobile, email, company, contactPerson, city, state, zone, pincode, segment, grade,
  // language, website, gstin, pan, clientCode, birthday, anniversary, nextFollowUp, interestedIn, tags, source, notes
  ['Rahul Shah', '9810011234', 'rahul@aureliajewellers.example', 'Aurelia Jewellers', 'Rahul Shah', 'Gurugram', 'Haryana', 'North', '122001', 'Chain of stores', 'A', 'Hindi', 'aureliajewellers.example', '06ABCDE1234F1Z5', 'ABCDE1234F', 'AUR-0142', '1985-04-12', '2004-11-20', '2026-10-05', 'Antique bridal sets', 'bulk-buyer; festive-2026', 'Exhibition — GJS', 'Wants antique kada designs'],
  ['Neha Kapoor', '9876500011', '', 'Kapoor Jewels', 'Neha Kapoor', 'Chandigarh', 'Chandigarh', 'North', '160017', 'Boutique store', 'B', 'Punjabi', '', '', '', '', '', '', '2026-10-08', 'Diamond rings', 'retail', 'Referral', ''],
];

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function buildTemplateCsv(): string {
  const rows = [headerLabels(), ...SAMPLE_ROWS];
  return rows.map((r) => r.map(csvEscape).join(',')).join('\r\n');
}

/** Excel-openable HTML table (application/vnd.ms-excel). */
export function buildTemplateExcelHtml(): string {
  const head = headerLabels().map((h) => `<th>${h}</th>`).join('');
  const body = SAMPLE_ROWS.map(
    (r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`,
  ).join('');
  return `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}

const BASE_NAME = 'talktrack-contacts-import-template';

/** Trigger a browser download of the template in the requested format. */
export function downloadTemplate(format: 'csv' | 'excel'): void {
  if (typeof document === 'undefined') return;
  const isCsv = format === 'csv';
  const content = isCsv ? buildTemplateCsv() : buildTemplateExcelHtml();
  const type = isCsv ? 'text/csv;charset=utf-8' : 'application/vnd.ms-excel';
  const ext = isCsv ? 'csv' : 'xls';
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${BASE_NAME}.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
