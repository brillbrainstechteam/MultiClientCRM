import type { RoleKey } from '@crm/mock-data';
import { automationCapabilityRoles, type AutomationCapability } from './domain/types';

export type Capability = AutomationCapability;

/**
 * Automation capability model (spec §Permissions/governance). The shell
 * already hides the whole module from `agent` (`workspace-context.tsx`
 * `roleHiddenModules`) — this only differentiates owner vs manager, and
 * guards direct deep links from any role that should not be here.
 */
export function can(role: RoleKey, capability: Capability): boolean {
  return automationCapabilityRoles[capability].includes(role);
}
