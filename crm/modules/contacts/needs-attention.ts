/**
 * "Needs Attention" model (Contacts requirement §4).
 *
 * Turns internal data-quality + zone-assignment checks into a short list of
 * plain-language, actionable items for SME users — only issues that need a
 * person to act. Non-essential gaps (missing company/email) are deliberately
 * excluded so the snapshot stays about what matters operationally.
 */

import { contactsInScope, importJobs } from '@crm/mock-data';
import type { ContactScope } from './contact-selectors';
import { assignZone } from './zones/zone-assignment';
import { duplicateClustersInScope, phoneQueue, missingOwnership } from './data-quality';

export type AttentionTone = 'warn' | 'danger' | 'neutral';

export interface AttentionItem {
  key: string;
  count: number;
  /** Plain-language message, e.g. "3 contacts need a city or state". */
  message: string;
  tone: AttentionTone;
  actionLabel: string;
  /** Path + optional query the Overview resolves via scopedHref. */
  path: string;
  query?: Record<string, string>;
}

function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return n === 1 ? singular : pluralForm;
}

export interface AttentionSummary {
  items: AttentionItem[];
  /** Contacts whose automatic zone/owner routing did not fully resolve. */
  requiringAssignment: number;
  possibleDuplicates: number;
}

export function needsAttention(scope: ContactScope): AttentionSummary {
  const rows = contactsInScope(scope);

  let locationRequired = 0;
  let unmappedZone = 0;
  let ownerNotAssigned = 0;
  for (const c of rows) {
    const r = assignZone({ city: c.city });
    if (r.status === 'location-required') locationRequired += 1;
    else if (r.status === 'unmapped-zone') unmappedZone += 1;
    else if (r.status === 'owner-not-assigned') ownerNotAssigned += 1;
  }

  const noOwnerRecord = missingOwnership(scope).length;
  const duplicates = duplicateClustersInScope(scope).length;
  const phone = phoneQueue.length;

  // Most recent import that left failed rows behind.
  const failedImport = importJobs.find((j) => j.counts.rejected > 0);

  const items: AttentionItem[] = [];

  if (locationRequired > 0) {
    items.push({
      key: 'location-required',
      count: locationRequired,
      message: `${locationRequired} ${plural(locationRequired, 'contact')} need a city or state`,
      tone: 'warn',
      actionLabel: 'Add location',
      path: '/contacts/all',
      query: { attention: 'location' },
    });
  }
  if (unmappedZone > 0) {
    items.push({
      key: 'unmapped-zone',
      count: unmappedZone,
      message: `${unmappedZone} ${plural(unmappedZone, 'contact')} could not be matched to a zone`,
      tone: 'warn',
      actionLabel: 'Review zones',
      path: '/contacts/zones',
    });
  }
  if (ownerNotAssigned + noOwnerRecord > 0) {
    const n = ownerNotAssigned + noOwnerRecord;
    items.push({
      key: 'owner-not-assigned',
      count: n,
      message: `${n} ${plural(n, 'contact')} could not be assigned to a team member`,
      tone: 'danger',
      actionLabel: 'Assign owner',
      path: '/contacts/zones',
    });
  }
  if (duplicates > 0) {
    items.push({
      key: 'duplicates',
      count: duplicates,
      message: `${duplicates} possible ${plural(duplicates, 'duplicate')} need review`,
      tone: 'warn',
      actionLabel: 'Review duplicates',
      path: '/contacts/data-quality',
    });
  }
  if (phone > 0) {
    items.push({
      key: 'phone',
      count: phone,
      message: `${phone} ${plural(phone, 'contact')} ${plural(phone, 'has', 'have')} mobile numbers to standardise`,
      tone: 'neutral',
      actionLabel: 'Fix numbers',
      path: '/contacts/data-quality',
    });
  }
  if (failedImport) {
    items.push({
      key: 'import-failed',
      count: failedImport.counts.rejected,
      message: `Last import left ${failedImport.counts.rejected} failed ${plural(failedImport.counts.rejected, 'row')} to fix`,
      tone: 'warn',
      actionLabel: 'Open import',
      path: `/contacts/imports/jobs/${failedImport.id}`,
    });
  }

  return {
    items,
    requiringAssignment: locationRequired + unmappedZone + ownerNotAssigned + noOwnerRecord,
    possibleDuplicates: duplicates,
  };
}
