import type { Contact, RoleKey } from '@crm/mock-data';

/**
 * Contacts capability model (CFG-CON-S09 applied at runtime). The rule from the
 * source spec: hide actions a role can never perform; disable contextually
 * unavailable ones with a reason; deep links to disallowed views show an
 * access-denied state without leaking protected data.
 *
 * The prototype exposes three roles; capabilities collapse the fuller role set
 * (owner ≈ Super Admin/Owner, manager ≈ Admin/Manager, agent ≈ Agent/Restricted).
 */
export type Capability =
  | 'viewReports'
  | 'manageImports'
  | 'assign'
  | 'export'
  | 'merge'
  | 'delete'
  | 'bulkTag'
  | 'bulkStage'
  | 'manageConfig';

const capabilityRoles: Record<Capability, RoleKey[]> = {
  viewReports: ['owner', 'manager'],
  manageImports: ['owner', 'manager'],
  assign: ['owner', 'manager'],
  export: ['owner', 'manager'],
  merge: ['owner', 'manager'],
  delete: ['owner'],
  bulkTag: ['owner', 'manager', 'agent'],
  bulkStage: ['owner', 'manager', 'agent'],
  manageConfig: ['owner'],
};

export function can(role: RoleKey, capability: Capability): boolean {
  return capabilityRoles[capability].includes(role);
}

/** Sensitive fields that some roles must not even see (masked, not rendered). */
export type SensitiveField = 'dealValue' | 'mobile' | 'email';

export function canViewField(role: RoleKey, field: SensitiveField): boolean {
  if (field === 'dealValue') return role === 'owner' || role === 'manager';
  // Mobile and email are viewable by all three prototype roles.
  return true;
}

/** Deterministic estimated deal value shown on Customer 360 (a sensitive field). */
export function dealValueFor(contact: Contact): string {
  const byTier: Record<Contact['salesTier'], number> = {
    platinum: 820000,
    gold: 420000,
    silver: 150000,
    standard: 40000,
  };
  return `₹${byTier[contact.salesTier].toLocaleString('en-IN')}`;
}
