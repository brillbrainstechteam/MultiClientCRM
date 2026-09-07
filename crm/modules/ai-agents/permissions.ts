import type { RoleKey } from '@crm/mock-data';

/**
 * AI Agents capability model (SKILL.md "Permissions"). The module itself is
 * hidden entirely from the `agent` role (workspace-context.tsx
 * `roleHiddenModules`) — these capabilities distinguish Owner from Manager
 * for the roles that can reach it at all.
 */
export type Capability =
  | 'ai_agent.view'
  | 'ai_agent.create'
  | 'ai_agent.edit'
  | 'ai_agent.test'
  | 'ai_agent.activate'
  | 'ai_agent.pause'
  | 'ai_agent.delete'
  | 'ai_agent.manage_knowledge'
  | 'ai_agent.manage_safety'
  | 'ai_agent.view_usage'
  | 'ai_agent.view_audit'
  | 'ai_agent.approve_sensitive_action'
  | 'ai_agent.approve_correction';

const capabilityRoles: Record<Capability, RoleKey[]> = {
  'ai_agent.view': ['owner', 'manager'],
  'ai_agent.create': ['owner', 'manager'],
  'ai_agent.edit': ['owner', 'manager'],
  'ai_agent.test': ['owner', 'manager'],
  'ai_agent.activate': ['owner', 'manager'],
  'ai_agent.pause': ['owner', 'manager'],
  'ai_agent.delete': ['owner'],
  'ai_agent.manage_knowledge': ['owner', 'manager'],
  'ai_agent.manage_safety': ['owner', 'manager'],
  'ai_agent.view_usage': ['owner', 'manager'],
  'ai_agent.view_audit': ['owner', 'manager'],
  'ai_agent.approve_sensitive_action': ['owner', 'manager'],
  'ai_agent.approve_correction': ['owner', 'manager'],
};

export function can(role: RoleKey, capability: Capability): boolean {
  return capabilityRoles[capability].includes(role);
}
