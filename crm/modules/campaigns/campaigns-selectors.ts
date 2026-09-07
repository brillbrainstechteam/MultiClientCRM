import { campaigns } from './data/mockCampaigns';
import type { Campaign, CampaignStatus } from './domain/types';

/**
 * Pure, deterministic read models over the campaign fixtures (mirrors
 * Templates' `templates-selectors.ts`) — screens filter through these
 * instead of inline logic so list counts/filters stay consistent.
 */

export type CampaignView = 'all' | CampaignStatus | 'archived';

export interface CampaignScope {
  branchId?: string | null;
  whatsappNumberId?: string | null;
}

export interface CampaignFilters {
  q?: string | null;
  view?: CampaignView | null;
  type?: string | null;
  creatorId?: string | null;
}

function inScope(campaign: Campaign, scope: CampaignScope): boolean {
  const branchOk = !scope.branchId || campaign.branchId === scope.branchId;
  const numberOk = !scope.whatsappNumberId || campaign.whatsappNumberId === scope.whatsappNumberId;
  return branchOk && numberOk;
}

const viewPredicates: Record<CampaignView, (c: Campaign) => boolean> = {
  all: (c) => !c.isArchived,
  draft: (c) => c.status === 'draft' && !c.isArchived,
  scheduled: (c) => c.status === 'scheduled' && !c.isArchived,
  live: (c) => c.status === 'live' && !c.isArchived,
  paused: (c) => c.status === 'paused' && !c.isArchived,
  completed: (c) => c.status === 'completed' && !c.isArchived,
  cancelled: (c) => c.status === 'cancelled' && !c.isArchived,
  archived: (c) => c.isArchived,
};

/** Scope + search/type/creator only — no status/archive predicate. Lets callers apply their own (possibly session-overridden) archive resolution on top. */
export function campaignsInScope(scope: CampaignScope, filters: Omit<CampaignFilters, 'view'>): Campaign[] {
  const q = filters.q?.trim().toLowerCase() ?? '';
  return campaigns.filter((campaign) => {
    if (!inScope(campaign, scope)) return false;
    if (filters.type && campaign.type !== filters.type) return false;
    if (filters.creatorId && campaign.creatorId !== filters.creatorId) return false;
    if (q) {
      const haystack = [campaign.name, campaign.type].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function filterCampaigns(scope: CampaignScope, filters: CampaignFilters): Campaign[] {
  const view = filters.view ?? 'all';
  const predicate = viewPredicates[view] ?? viewPredicates.all;
  const q = filters.q?.trim().toLowerCase() ?? '';

  return campaigns.filter((campaign) => {
    if (!inScope(campaign, scope)) return false;
    if (!predicate(campaign)) return false;
    if (filters.type && campaign.type !== filters.type) return false;
    if (filters.creatorId && campaign.creatorId !== filters.creatorId) return false;
    if (q) {
      const haystack = [campaign.name, campaign.type].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export interface CampaignViewCounts {
  all: number;
  draft: number;
  scheduled: number;
  live: number;
  paused: number;
  completed: number;
  cancelled: number;
  archived: number;
}

export function campaignViewCounts(scope: CampaignScope): CampaignViewCounts {
  const scoped = campaigns.filter((campaign) => inScope(campaign, scope));
  return {
    all: scoped.filter(viewPredicates.all).length,
    draft: scoped.filter(viewPredicates.draft).length,
    scheduled: scoped.filter(viewPredicates.scheduled).length,
    live: scoped.filter(viewPredicates.live).length,
    paused: scoped.filter(viewPredicates.paused).length,
    completed: scoped.filter(viewPredicates.completed).length,
    cancelled: scoped.filter(viewPredicates.cancelled).length,
    archived: scoped.filter(viewPredicates.archived).length,
  };
}

export function sortCampaigns(rows: Campaign[], sort: 'updated-desc' | 'name-asc' | 'created-desc' = 'updated-desc'): Campaign[] {
  const copy = [...rows];
  if (sort === 'name-asc') return copy.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'created-desc') return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
