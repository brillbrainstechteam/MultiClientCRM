import {
  contacts,
  duplicateClusters,
  findUser,
  type Contact,
  type ConsentState,
  type ContactStage,
} from '@crm/mock-data';

/**
 * Pure, deterministic read models over the contact fixtures. Screens call these
 * instead of filtering inline, so Overview counts and All-Contacts filters stay
 * consistent and reproducible.
 */

export interface ContactScope {
  branchId?: string | null;
  whatsappNumberId?: string | null;
}

function inScope(contact: Contact, scope: ContactScope): boolean {
  const branchOk = !scope.branchId || contact.branchId === scope.branchId;
  const numberOk =
    !scope.whatsappNumberId || contact.primaryWhatsAppNumberId === scope.whatsappNumberId;
  return branchOk && numberOk;
}

/** A contact is "incomplete" when key profile fields are missing (data quality). */
export function isIncomplete(contact: Contact): boolean {
  return (
    !contact.email ||
    !contact.company ||
    contact.consent === 'pending' ||
    contact.tags.includes('unnamed-inbound')
  );
}

const NEW_WINDOW_DAYS = 14;
const REFERENCE_NOW = new Date('2026-08-10T00:00:00+05:30').getTime();

function isRecentlyAdded(contact: Contact): boolean {
  const created = new Date(contact.createdAt).getTime();
  return REFERENCE_NOW - created <= NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

export interface OverviewStats {
  total: number;
  active: number;
  unsubscribed: number;
  newlyAdded: number;
  incomplete: number;
  consentPending: number;
  duplicateContacts: number;
}

export function overviewStats(scope: ContactScope): OverviewStats {
  const scoped = contacts.filter((contact) => inScope(contact, scope));
  const scopedIds = new Set(scoped.map((contact) => contact.id));
  const duplicateContacts = duplicateClusters.reduce(
    (sum, cluster) =>
      sum + cluster.contactIds.filter((id) => scopedIds.has(id)).length,
    0,
  );

  return {
    total: scoped.length,
    active: scoped.filter((c) => c.consent === 'opted-in' && c.stage !== 'dormant').length,
    unsubscribed: scoped.filter((c) => c.consent === 'opted-out').length,
    newlyAdded: scoped.filter(isRecentlyAdded).length,
    incomplete: scoped.filter(isIncomplete).length,
    consentPending: scoped.filter((c) => c.consent === 'pending').length,
    duplicateContacts,
  };
}

export interface MixSlice {
  label: string;
  value: number;
}

/** Customer mix counts, sorted desc, for the Overview breakdown widgets. */
export function mixByStage(scope: ContactScope): MixSlice[] {
  return countBy(scope, (c) => stageDisplay(c.stage));
}

export function mixBySource(scope: ContactScope): MixSlice[] {
  return countBy(scope, (c) => c.source);
}

export function mixByOwner(scope: ContactScope): MixSlice[] {
  return countBy(scope, (c) => findUser(c.ownerId)?.name ?? 'Unassigned');
}

function countBy(scope: ContactScope, key: (c: Contact) => string): MixSlice[] {
  const map = new Map<string, number>();
  for (const contact of contacts.filter((c) => inScope(c, scope))) {
    const k = key(contact);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function stageDisplay(stage: ContactStage): string {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

/* ------------------------------------------------------------------------- */
/* All Contacts list filtering (CON-S02).                                     */
/* ------------------------------------------------------------------------- */

export interface ContactFilters {
  q?: string | null;
  stage?: string | null;
  leadStatus?: string | null;
  lifecycle?: string | null;
  customerType?: string | null;
  consent?: string | null;
  ownerId?: string | null;
  source?: string | null;
}

export function filterContacts(scope: ContactScope, filters: ContactFilters): Contact[] {
  const q = filters.q?.trim().toLowerCase() ?? '';
  return contacts.filter((contact) => {
    if (!inScope(contact, scope)) return false;
    if (filters.stage && contact.stage !== filters.stage) return false;
    if (filters.leadStatus && (contact.leadStatus ?? 'new') !== filters.leadStatus) return false;
    if (filters.lifecycle && (contact.lifecycleStage ?? 'prospect') !== filters.lifecycle) return false;
    if (filters.customerType && (contact.customerType ?? 'b2b') !== filters.customerType) return false;
    if (filters.consent && contact.consent !== filters.consent) return false;
    if (filters.ownerId && contact.ownerId !== filters.ownerId) return false;
    if (filters.source && contact.source !== filters.source) return false;
    if (q) {
      const haystack = [
        contact.name,
        contact.mobile,
        contact.email ?? '',
        contact.company ?? '',
        contact.ownerId,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/** Distinct source values present in the data (for filter dropdowns). */
export function distinctSources(): string[] {
  return [...new Set(contacts.map((c) => c.source))].sort();
}

export const consentOptions: { value: ConsentState; label: string }[] = [
  { value: 'opted-in', label: 'Opted in' },
  { value: 'opted-out', label: 'Opted out' },
  { value: 'pending', label: 'Consent pending' },
];

/* Filter dropdown option lists for the requirement's lead/lifecycle/type fields. */
export const leadStatusFilterOptions: { value: string; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'attempted', label: 'Attempted' },
  { value: 'connected', label: 'Connected' },
  { value: 'engaged', label: 'Engaged' },
  { value: 'enquiry_generated', label: 'Enquiry Generated' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'dormant', label: 'Dormant' },
];
export const lifecycleFilterOptions: { value: string; label: string }[] = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'customer', label: 'Customer' },
];
export const customerTypeFilterOptions: { value: string; label: string }[] = [
  { value: 'b2b', label: 'B2B' },
  { value: 'b2c', label: 'B2C' },
];
