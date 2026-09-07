import type { Segment } from './types';

/**
 * Deterministic segment fixtures. Includes both Dynamic and Snapshot modes
 * (prototype default 2.2) so the Segments list and Builder can render real
 * variety. `conditions` are the human-readable summary; `conditionGroups` hold
 * the structured AND/OR definition used by the builder and match count.
 */
export const segments: Segment[] = [
  {
    id: 'segment_high_value_delhi',
    name: 'High-value · Delhi',
    description: 'Gold and platinum tiers owned out of the Delhi branch.',
    type: 'dynamic',
    scope: { branchId: 'branch_delhi' },
    conditions: ['Sales tier is Gold or Platinum', 'Branch is Delhi NCR', 'Consent is Opted-in'],
    conditionGroups: [
      {
        id: 'group_1',
        joiner: 'or',
        conditions: [
          { id: 'c1', field: 'salesTier', operator: 'is', value: 'gold' },
          { id: 'c2', field: 'salesTier', operator: 'is', value: 'platinum' },
        ],
      },
      {
        id: 'group_2',
        joiner: 'and',
        conditions: [
          { id: 'c3', field: 'branchId', operator: 'is', value: 'branch_delhi' },
          { id: 'c4', field: 'consent', operator: 'is', value: 'opted-in' },
        ],
      },
    ],
    groupJoiner: 'and',
    count: 128,
    ownerId: 'user_vikram',
    updatedAt: '2026-08-08T12:10:00+05:30',
    usedByCampaignIds: ['campaign_festive_launch'],
  },
  {
    id: 'segment_festive_snapshot',
    name: 'Festive 2026 audience (snapshot)',
    description: 'Frozen list captured for the festive launch campaign.',
    type: 'snapshot',
    scope: {},
    conditions: ['Tag includes festive-2026', 'Stage is Qualified or Customer'],
    conditionGroups: [
      {
        id: 'group_1',
        joiner: 'and',
        conditions: [
          { id: 'c1', field: 'tag', operator: 'contains', value: 'festive-2026' },
          { id: 'c2', field: 'stage', operator: 'is-not', value: 'dormant' },
        ],
      },
    ],
    groupJoiner: 'and',
    count: 342,
    ownerId: 'user_anita',
    updatedAt: '2026-07-30T09:00:00+05:30',
    usedByCampaignIds: ['campaign_festive_launch'],
  },
  {
    id: 'segment_dormant_reengage',
    name: 'Dormant · re-engage',
    description: 'No activity in 90 days, still opted-in.',
    type: 'dynamic',
    scope: {},
    conditions: ['Last activity is older than 90 days', 'Consent is Opted-in'],
    conditionGroups: [
      {
        id: 'group_1',
        joiner: 'and',
        conditions: [
          { id: 'c1', field: 'lastActivityAt', operator: 'in-last-days', value: '90' },
          { id: 'c2', field: 'consent', operator: 'is', value: 'opted-in' },
        ],
      },
    ],
    groupJoiner: 'and',
    count: 57,
    ownerId: 'user_meera',
    updatedAt: '2026-08-05T16:45:00+05:30',
    usedByCampaignIds: [],
  },
];

export function findSegment(segmentId: string): Segment | undefined {
  return segments.find((segment) => segment.id === segmentId);
}
