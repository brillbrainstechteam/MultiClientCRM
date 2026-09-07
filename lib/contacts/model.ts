/** Shared Contacts-module vocabulary — used by server and client. Pure data. */

export type Option = { value: string; label: string; tone?: Tone };
export type Tone = 'gray' | 'blue' | 'emerald' | 'gold' | 'red' | 'purple';

/** Lead status = the prospecting pipeline (new prospects only). */
export const LEAD_STATUSES: Option[] = [
  { value: 'new', label: 'New', tone: 'gray' },
  { value: 'assigned', label: 'Assigned', tone: 'blue' },
  { value: 'attempted', label: 'Attempted', tone: 'blue' },
  { value: 'connected', label: 'Connected', tone: 'purple' },
  { value: 'engaged', label: 'Engaged', tone: 'emerald' },
  { value: 'enquiry_generated', label: 'Enquiry generated', tone: 'gold' },
  { value: 'not_interested', label: 'Not interested', tone: 'red' },
  { value: 'dormant', label: 'Dormant', tone: 'gray' },
];

/** The ordered "working" stages a prospect moves through (excludes terminal). */
export const LEAD_PIPELINE = ['new', 'assigned', 'attempted', 'connected', 'engaged', 'enquiry_generated'];

/** Customer lifecycle = the relationship, distinct from the lead pipeline. */
export const LIFECYCLE_STAGES: Option[] = [
  { value: 'prospect', label: 'Prospect', tone: 'blue' },
  { value: 'customer', label: 'Existing customer', tone: 'emerald' },
];

export const RELATIONSHIP_STATES: Option[] = [
  { value: 'active', label: 'Active', tone: 'emerald' },
  { value: 'dormant', label: 'Dormant', tone: 'gray' },
  { value: 'reactivated', label: 'Reactivated', tone: 'gold' },
];

export const SOURCES: Option[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'referral', label: 'Referral' },
  { value: 'exhibition', label: 'Exhibition / event' },
  { value: 'website', label: 'Website' },
  { value: 'ads', label: 'Ads / lead form' },
  { value: 'walk-in', label: 'Walk-in' },
  { value: 'import', label: 'Import' },
  { value: 'other', label: 'Other' },
];

export const BUSINESS_VALUES: Option[] = [
  { value: 'high', label: 'High', tone: 'gold' },
  { value: 'medium', label: 'Medium', tone: 'blue' },
  { value: 'low', label: 'Low', tone: 'gray' },
];

export const CONTACT_TYPES: Option[] = [
  { value: 'b2b', label: 'Business (B2B)' },
  { value: 'b2c', label: 'Individual (B2C)' },
];

export const ACTIVITY_KINDS: Record<string, { label: string; tone: Tone }> = {
  note: { label: 'Note', tone: 'gray' },
  message: { label: 'Message', tone: 'emerald' },
  call: { label: 'Call', tone: 'blue' },
  enquiry: { label: 'Enquiry', tone: 'gold' },
  order: { label: 'Order', tone: 'gold' },
  campaign: { label: 'Campaign', tone: 'purple' },
  stage: { label: 'Stage change', tone: 'blue' },
  ownership: { label: 'Ownership', tone: 'purple' },
  'field-visit': { label: 'Field visit', tone: 'emerald' },
  system: { label: 'System', tone: 'gray' },
};

export function labelOf(list: Option[], value?: string | null): string {
  if (!value) return '—';
  return list.find((o) => o.value === value)?.label ?? value;
}
export function toneOf(list: Option[], value?: string | null): Tone {
  return (value && list.find((o) => o.value === value)?.tone) || 'gray';
}

/** Profile completeness 0–100 across the fields that matter for a usable record. */
export function completeness(c: Record<string, unknown>): number {
  const fields = ['name', 'phone', 'email', 'city', 'source', 'salesOwnerId'];
  const b2b = c.type === 'b2b' ? ['businessName', 'contactPerson', 'gstin'] : ['name'];
  const all = [...new Set([...fields, ...b2b])];
  const filled = all.filter((f) => {
    const v = c[f];
    return v !== null && v !== undefined && String(v).trim() !== '';
  }).length;
  return Math.round((filled / all.length) * 100);
}

/** Normalise a phone to digits only (E.164-ish without '+'), for dedup/matching. */
export function normalizePhone(raw: string): string {
  return (raw || '').replace(/[^\d]/g, '').replace(/^0+/, '');
}
