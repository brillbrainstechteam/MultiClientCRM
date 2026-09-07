/**
 * Deterministic configuration masters for Contact settings (CFG-CON-S01–S09).
 * These are workspace-configuration fixtures, distinct from operational contact
 * data. User/team/branch identity stays in Team & Access — referenced, never
 * redefined here.
 */

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'dropdown' | 'yes-no';
  mandatory: boolean;
  active: boolean;
  /** Records that depend on this field (drives the delete dependency warning). */
  usedByContacts: number;
  usedBySegments: number;
}

export const customFields: CustomField[] = [
  { id: 'field_gst', name: 'GST number', type: 'text', mandatory: false, active: true, usedByContacts: 214, usedBySegments: 1 },
  { id: 'field_budget', name: 'Budget range', type: 'dropdown', mandatory: false, active: true, usedByContacts: 96, usedBySegments: 2 },
  { id: 'field_anniversary', name: 'Anniversary', type: 'date', mandatory: false, active: true, usedByContacts: 41, usedBySegments: 0 },
  { id: 'field_loyalty', name: 'Loyalty member', type: 'yes-no', mandatory: false, active: false, usedByContacts: 0, usedBySegments: 0 },
];

export interface TagConfig {
  id: string;
  name: string;
  color: string;
  category: string;
  usedBy: number;
  active: boolean;
}

export const tagConfigs: TagConfig[] = [
  { id: 'tag_bulk', name: 'bulk-buyer', color: '#1B7A6B', category: 'Behaviour', usedBy: 128, active: true },
  { id: 'tag_festive', name: 'festive-2026', color: '#C9A227', category: 'Campaign', usedBy: 342, active: true },
  { id: 'tag_premium', name: 'premium', color: '#12304C', category: 'Tier', usedBy: 57, active: true },
  { id: 'tag_lapsed', name: 'lapsed', color: '#B0453F', category: 'Lifecycle', usedBy: 63, active: true },
  { id: 'tag_inbound', name: 'inbound', color: '#4A5D6E', category: 'Source', usedBy: 90, active: false },
];

export interface LifecycleStage {
  id: string;
  name: string;
  kind: 'active' | 'closure';
  isDefaultNew: boolean;
}

export const lifecycleStages: LifecycleStage[] = [
  { id: 'stg_new', name: 'New Lead', kind: 'active', isDefaultNew: true },
  { id: 'stg_contacted', name: 'Contacted', kind: 'active', isDefaultNew: false },
  { id: 'stg_interested', name: 'Interested', kind: 'active', isDefaultNew: false },
  { id: 'stg_catalogue', name: 'Catalogue Shared', kind: 'active', isDefaultNew: false },
  { id: 'stg_followup', name: 'Follow-up', kind: 'active', isDefaultNew: false },
  { id: 'stg_order', name: 'Order', kind: 'active', isDefaultNew: false },
  { id: 'stg_repeat', name: 'Repeat Customer', kind: 'active', isDefaultNew: false },
  { id: 'stg_won', name: 'Won', kind: 'closure', isDefaultNew: false },
  { id: 'stg_lost', name: 'Lost', kind: 'closure', isDefaultNew: false },
];

export interface SourceConfig {
  id: string;
  name: string;
  active: boolean;
  externalMapping: string;
}

export const sourceConfigs: SourceConfig[] = [
  { id: 'src_walkin', name: 'Walk-in register', active: true, externalMapping: 'offline.walkin' },
  { id: 'src_web', name: 'Website form', active: true, externalMapping: 'web.lead_form' },
  { id: 'src_campaign', name: 'Campaign click', active: true, externalMapping: 'wa.campaign' },
  { id: 'src_referral', name: 'Referral', active: true, externalMapping: 'offline.referral' },
  { id: 'src_tradeshow', name: 'Trade show', active: false, externalMapping: 'offline.event' },
];

/** Roles referenced from Team & Access — shown, not editable membership here. */
export const permissionRoles = ['Owner', 'Manager', 'Agent'] as const;
export type PermissionRole = (typeof permissionRoles)[number];

export interface PermissionRow {
  action: string;
  /** Whether each role is granted; `null` = capability hidden for that role. */
  grants: Record<PermissionRole, boolean | null>;
}

export const permissionMatrix: PermissionRow[] = [
  { action: 'View contacts', grants: { Owner: true, Manager: true, Agent: true } },
  { action: 'Edit contacts', grants: { Owner: true, Manager: true, Agent: true } },
  { action: 'Assign / reassign', grants: { Owner: true, Manager: true, Agent: false } },
  { action: 'Export', grants: { Owner: true, Manager: true, Agent: null } },
  { action: 'Merge duplicates', grants: { Owner: true, Manager: true, Agent: null } },
  { action: 'Delete / erase', grants: { Owner: true, Manager: false, Agent: null } },
  { action: 'Manage configuration', grants: { Owner: true, Manager: false, Agent: null } },
];

export interface SensitiveFieldRow {
  field: string;
  view: Record<PermissionRole, boolean>;
  edit: Record<PermissionRole, boolean>;
}

export const sensitiveFields: SensitiveFieldRow[] = [
  { field: 'WhatsApp mobile', view: { Owner: true, Manager: true, Agent: true }, edit: { Owner: true, Manager: true, Agent: false } },
  { field: 'Email', view: { Owner: true, Manager: true, Agent: true }, edit: { Owner: true, Manager: true, Agent: true } },
  { field: 'Deal value', view: { Owner: true, Manager: true, Agent: false }, edit: { Owner: true, Manager: false, Agent: false } },
];
