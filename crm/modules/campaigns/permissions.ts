import type { RoleKey } from '@crm/mock-data';
import type { Campaign } from './domain/types';

/**
 * Campaigns capability model (SKILL.md §Permissions). Hide actions a role
 * should never perform; disable contextually unavailable ones with a reason;
 * never let a user reach the final irreversible action before a known
 * permission block is revealed.
 */
export type Capability =
  | 'campaign.view'
  | 'campaign.create'
  | 'campaign.edit'
  | 'campaign.schedule'
  | 'campaign.send'
  | 'campaign.pause'
  | 'campaign.resume'
  | 'campaign.cancel'
  | 'campaign.archive'
  | 'campaign.export'
  | 'campaign.view_spend'
  | 'campaign.compare'
  | 'campaign.create_result_segment'
  | 'campaign.retry'
  | 'campaign.manage_trigger'
  | 'campaign.manage_api';

const capabilityRoles: Record<Capability, RoleKey[]> = {
  'campaign.view': ['owner', 'manager', 'agent'],
  'campaign.create': ['owner', 'manager', 'agent'],
  'campaign.edit': ['owner', 'manager', 'agent'],
  'campaign.schedule': ['owner', 'manager', 'agent'],
  'campaign.send': ['owner', 'manager'],
  'campaign.pause': ['owner', 'manager'],
  'campaign.resume': ['owner', 'manager'],
  'campaign.cancel': ['owner', 'manager'],
  'campaign.archive': ['owner', 'manager'],
  'campaign.export': ['owner', 'manager'],
  'campaign.view_spend': ['owner', 'manager'],
  'campaign.compare': ['owner', 'manager', 'agent'],
  'campaign.create_result_segment': ['owner', 'manager'],
  'campaign.retry': ['owner', 'manager'],
  'campaign.manage_trigger': ['owner', 'manager'],
  'campaign.manage_api': ['owner'],
};

export function can(role: RoleKey, capability: Capability): boolean {
  return capabilityRoles[capability].includes(role);
}

/** A draft is only editable by its creator unless the role can edit others' drafts. */
export function canEditDraft(role: RoleKey, userId: string, campaign: Pick<Campaign, 'creatorId' | 'status'>): boolean {
  if (campaign.status !== 'draft') return false;
  if (campaign.creatorId !== userId) return can(role, 'campaign.edit') && role !== 'agent';
  return can(role, 'campaign.edit');
}
