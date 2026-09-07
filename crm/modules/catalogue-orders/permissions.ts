import type { RoleKey } from '@crm/mock-data';
import type { CommerceCapability } from './domain/types';

export type Capability = CommerceCapability;

/**
 * Commerce capability model (Requirement §AI). The shell's `roleHiddenModules`
 * never hides `catalogue-orders` itself (every role can see the module), so
 * this is what differentiates owner/manager/agent inside it, and what a
 * direct deep link is checked against (never leak data — CLAUDE.md §9).
 */
const capabilityRoles: Record<Capability, RoleKey[]> = {
  'catalogue.view': ['owner', 'manager', 'agent'],
  'catalogue.create': ['owner', 'manager'],
  'catalogue.configureSchema': ['owner', 'manager'],
  'catalogue.import': ['owner', 'manager'],
  'catalogue.editCrmFields': ['owner', 'manager', 'agent'],
  'catalogue.editSourceFields': [],
  'catalogue.manageMedia': ['owner', 'manager', 'agent'],
  'inventory.view': ['owner', 'manager', 'agent'],
  'inventory.adjust': ['owner', 'manager'],
  'price.view': ['owner', 'manager', 'agent'],
  'weight.view': ['owner', 'manager', 'agent'],
  'catalogue.share': ['owner', 'manager', 'agent'],
  'selection.create': ['owner', 'manager', 'agent'],
  'selection.assign': ['owner', 'manager'],
  'orderRequest.create': ['owner', 'manager', 'agent'],
  'order.view': ['owner', 'manager', 'agent'],
  'order.requestCancel': ['owner', 'manager', 'agent'],
  'payment.request': ['owner', 'manager', 'agent'],
  'refund.request': ['owner', 'manager'],
  'approval.approve': ['owner', 'manager'],
  'integration.manage': ['owner'],
  'audit.view': ['owner', 'manager'],
  'export.use': ['owner', 'manager'],
};

export function can(role: RoleKey, capability: Capability): boolean {
  return capabilityRoles[capability].includes(role);
}

/**
 * "Restricted User" (Requirement §A2 personas) is demonstrated with the
 * existing `agent` role scoped to a single branch — the workspace shell
 * already narrows `availableBranches`/`availableWhatsAppNumbers` for agents
 * (`workspace-context.tsx`), so branch-restricted screens fall out of that
 * scoping rather than a fourth role key.
 */
export function isRestrictedRole(role: RoleKey): boolean {
  return role === 'agent';
}
