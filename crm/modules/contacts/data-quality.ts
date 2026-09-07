import { contacts, duplicateClusters, type Contact } from '@crm/mock-data';
import { isIncomplete, type ContactScope } from './contact-selectors';

/**
 * Read models for Data Quality (CON-S09). Each returns the affected contacts so
 * the tabs, counts and drilldowns stay consistent with the fixtures.
 */

function inScope(contact: Contact, scope: ContactScope): boolean {
  const branchOk = !scope.branchId || contact.branchId === scope.branchId;
  const numberOk =
    !scope.whatsappNumberId || contact.primaryWhatsAppNumberId === scope.whatsappNumberId;
  return branchOk && numberOk;
}

/** Which required fields a contact is missing (drives the "Missing" column). */
export function missingFields(contact: Contact): string[] {
  const missing: string[] = [];
  if (!contact.company) missing.push('Company');
  if (!contact.email) missing.push('Email');
  if (contact.consent === 'pending') missing.push('Consent');
  if (!contact.ownerId) missing.push('Owner');
  return missing;
}

export function incompleteProfiles(scope: ContactScope): Contact[] {
  return contacts.filter((c) => inScope(c, scope) && isIncomplete(c));
}

export function missingOwnership(scope: ContactScope): Contact[] {
  return contacts.filter((c) => inScope(c, scope) && !c.ownerId);
}

export function consentIssues(scope: ContactScope): Contact[] {
  return contacts.filter((c) => inScope(c, scope) && c.consent !== 'opted-in');
}

export function duplicateClustersInScope(scope: ContactScope) {
  return duplicateClusters.filter((cluster) =>
    cluster.contactIds.some((id) => {
      const c = contacts.find((x) => x.id === id);
      return c ? inScope(c, scope) : false;
    }),
  );
}

/** Representative phone-standardization queue (raw → normalized). */
export interface PhoneFix {
  contactId: string;
  name: string;
  raw: string;
  normalized: string;
}

export const phoneQueue: PhoneFix[] = [
  { contactId: 'contact_rahul_shah', name: 'Rahul Shah', raw: '9810011234', normalized: '+91 98100 11234' },
  { contactId: 'contact_priya_menon', name: 'Priya Menon', raw: '098200 22345', normalized: '+91 98200 22345' },
  { contactId: 'contact_arjun_verma', name: 'Arjun Verma', raw: '9810033456', normalized: '+91 98100 33456' },
];

export interface DataQualityCounts {
  incomplete: number;
  phone: number;
  duplicates: number;
  ownership: number;
  consent: number;
}

export function dataQualityCounts(scope: ContactScope): DataQualityCounts {
  return {
    incomplete: incompleteProfiles(scope).length,
    phone: phoneQueue.length,
    duplicates: duplicateClustersInScope(scope).length,
    ownership: missingOwnership(scope).length,
    consent: consentIssues(scope).length,
  };
}
