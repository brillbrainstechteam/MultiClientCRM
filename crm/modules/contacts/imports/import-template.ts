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
  { key: 'company', label: 'Company', required: false, example: 'Shah Textiles', help: 'Optional.' },
  { key: 'city', label: 'City', required: false, example: 'Gurugram', help: 'Used for zone routing — recommended.' },
  { key: 'state', label: 'State', required: false, example: 'Haryana', help: 'Used for zone routing when city is unknown.' },
  { key: 'tags', label: 'Tags', required: false, example: 'bulk-buyer; festive-2026', help: 'Separate multiple tags with a semicolon.' },
  { key: 'source', label: 'Source', required: false, example: 'Walk-in register', help: 'Where the contact came from.' },
  { key: 'notes', label: 'Notes', required: false, example: 'Interested in bulk cotton', help: 'Free text.' },
];

/** Header cell text — mandatory fields carry a trailing asterisk. */
function headerLabels(): string[] {
  return templateFields.map((f) => (f.required ? `${f.label}*` : f.label));
}

const SAMPLE_ROWS: string[][] = [
  ['Rahul Shah', '9810011234', 'rahul@shahtextiles.example', 'Shah Textiles', 'Gurugram', 'Haryana', 'bulk-buyer; festive-2026', 'Walk-in register', 'Interested in bulk cotton'],
  ['Neha Kapoor', '9876500011', '', '', 'Chandigarh', 'Chandigarh', 'retail', 'Referral', ''],
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
