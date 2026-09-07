import { segments } from '@crm/mock-data';
import type { AudienceExclusionRef, AudienceSourceRef } from '../domain/types';

/**
 * Selectable audience sources for CAM-S05 (CODE_FIRST_ADAPTER.md §5 "Audience
 * calculation"). Segments come from the real cross-module `Segment` fixtures
 * (`@crm/mock-data/segments`) so a picked segment's id/count stay consistent with
 * Contacts. Contacts has no persisted "saved filter" entity yet (its
 * CON-S12 advanced filter is ad-hoc/unsaved) — `filterSources` are Campaigns-
 * local named-filter fixtures in the same authored-count style every other
 * `AudienceSourceRef` in this module already uses (see `data/mockCampaigns.ts`).
 */

/** Per-branch accessible-database totals — authored fixtures, same convention as every other count in this module. */
const entireDatabaseTotals: Record<string, number> = {
  branch_delhi: 2450,
  branch_mumbai: 1120,
  branch_bengaluru: 640,
};

export function entireDatabaseCount(branchId: string): number {
  if (branchId === 'all') {
    return Object.values(entireDatabaseTotals).reduce((sum, count) => sum + count, 0);
  }
  return entireDatabaseTotals[branchId] ?? 0;
}

/** Segments scoped to the current branch, or unscoped ("all branches") segments — mirrors Contacts' own segment scoping. */
export function segmentSources(branchId: string): AudienceSourceRef[] {
  return segments
    .filter((segment) => !segment.scope.branchId || branchId === 'all' || segment.scope.branchId === branchId)
    .map((segment) => ({ id: segment.id, kind: 'segment', label: segment.name, count: segment.count }));
}

export const filterSources: AudienceSourceRef[] = [
  { id: 'filter_city_mumbai_engaged', kind: 'filter', label: 'City is Mumbai AND Stage is Engaged or Qualified', count: 640 },
  { id: 'filter_tag_vip', kind: 'filter', label: 'Tag includes vip', count: 210 },
  { id: 'filter_sales_tier_platinum', kind: 'filter', label: 'Sales tier is Platinum', count: 96 },
  { id: 'filter_stage_customer', kind: 'filter', label: 'Stage is Customer', count: 430 },
];

export const exclusionSources: AudienceExclusionRef[] = [
  { id: 'excl_previous_recipients_7d', kind: 'previous-recipients', label: 'Messaged by any campaign in the last 7 days', count: 60 },
  { id: 'excl_vip_embargo', kind: 'contacts', label: 'Manually excluded (VIP embargo list)', count: 8 },
  { id: 'excl_segment_dormant', kind: 'segment', label: 'Dormant · re-engage (segment)', count: 57 },
];

/**
 * Deterministic waterfall-decay estimate. Not a real dedupe/consent/validation
 * engine (CLAUDE.md "do not invent... a production consent engine") — a fixed
 * percentage of the post-source total at each stage, same spirit as the
 * static decay figures already authored into `data/mockCampaigns.ts` fixtures,
 * just computed instead of hand-authored so newly composed audiences still
 * show a believable, non-zero waterfall.
 */
export function estimateAudienceDecay(includedCount: number, sourceCount: number) {
  const duplicatesRemoved = sourceCount > 1 ? Math.round(includedCount * 0.04) : 0;
  const afterDupes = includedCount - duplicatesRemoved;
  const consentIneligible = Math.round(afterDupes * 0.05);
  const afterConsent = afterDupes - consentIneligible;
  const invalidContactData = Math.round(afterConsent * 0.02);
  return { duplicatesRemoved, consentIneligible, invalidContactData };
}
