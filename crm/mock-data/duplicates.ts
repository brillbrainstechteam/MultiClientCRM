import type { DuplicateCluster } from './types';

/**
 * Duplicate clusters for Data Quality and Merge Review (CON-S09/S11).
 * Strong = exact normalized mobile; possible = fuzzy name/company or email.
 */
export const duplicateClusters: DuplicateCluster[] = [
  {
    id: 'dupe_rahul_shah',
    matchStrength: 'possible',
    matchReason: 'Same company and similar name; different mobile.',
    contactIds: ['contact_rahul_shah', 'contact_arjun_verma'],
    suggestedPrimaryId: 'contact_rahul_shah',
  },
  {
    id: 'dupe_priya_menon',
    matchStrength: 'strong',
    matchReason: 'Exact normalized mobile match (+91 98200 22345).',
    contactIds: ['contact_priya_menon', 'contact_kavita_desai'],
    suggestedPrimaryId: 'contact_priya_menon',
  },
];

export function findDuplicateCluster(clusterId: string): DuplicateCluster | undefined {
  return duplicateClusters.find((cluster) => cluster.id === clusterId);
}
