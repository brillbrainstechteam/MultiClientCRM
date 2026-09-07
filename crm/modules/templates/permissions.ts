import type { RoleKey } from '@crm/mock-data';
import type { Template } from './domain/types';

/**
 * Templates capability model (spec §Permissions). Hide actions a role should
 * never perform; disable contextually unavailable ones with a reason;
 * protected deep links show a permission-denied state instead of leaking data.
 */
export type Capability =
  | 'create'
  | 'editDraft'
  | 'editOthersDraft'
  | 'submitToMeta'
  | 'internalApprove'
  | 'archive'
  | 'delete'
  | 'bulkActions'
  | 'manageLibrary'
  | 'viewApprovalsQueue';

const capabilityRoles: Record<Capability, RoleKey[]> = {
  create: ['owner', 'manager', 'agent'],
  editDraft: ['owner', 'manager', 'agent'],
  editOthersDraft: ['owner', 'manager'],
  submitToMeta: ['owner', 'manager'],
  internalApprove: ['owner', 'manager'],
  archive: ['owner', 'manager'],
  delete: ['owner'],
  bulkActions: ['owner', 'manager'],
  manageLibrary: ['owner', 'manager'],
  viewApprovalsQueue: ['owner', 'manager'],
};

export function can(role: RoleKey, capability: Capability): boolean {
  return capabilityRoles[capability].includes(role);
}

/** A draft is only editable by its creator unless the role can edit others' drafts. */
export function canEditTemplate(role: RoleKey, userId: string, template: Template): boolean {
  if (template.crmState === 'deleted') return false;
  if (template.metaStatus === 'pending') return false;
  if (template.crmState === 'draft' && template.creatorId !== userId) {
    return can(role, 'editOthersDraft');
  }
  return can(role, 'editDraft');
}
