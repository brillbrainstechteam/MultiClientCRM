import type { RoleKey } from '@crm/mock-data';

/**
 * Team & Access capability model — gates the module's own admin screens for
 * the acting shell role (`?role=owner|manager|agent`). This is distinct from
 * the 6-role `Role` entity Team & Access itself administers (that model is
 * the data being managed, not the guard on managing it).
 *
 * `agent` already loses the whole module from the sidebar
 * (`roleHiddenModules` in `workspace-context.tsx`); capabilities below matter
 * for deep links and for differentiating what an owner vs a manager may do
 * once inside.
 */
export type Capability =
  | 'viewPeople'
  | 'inviteMember'
  | 'editMember'
  | 'manageNumberAccess'
  | 'manageTeamsBranches'
  | 'manageWorkload'
  | 'manageRouting'
  | 'manageRoles'
  | 'manageAssignmentRules'
  | 'startExit'
  | 'viewPerformance'
  | 'viewAudit'
  | 'exportAudit'
  | 'revokeSession';

const capabilityRoles: Record<Capability, RoleKey[]> = {
  viewPeople: ['owner', 'manager'],
  inviteMember: ['owner', 'manager'],
  editMember: ['owner', 'manager'],
  manageNumberAccess: ['owner', 'manager'],
  manageTeamsBranches: ['owner', 'manager'],
  manageWorkload: ['owner', 'manager'],
  manageRouting: ['owner', 'manager'],
  manageRoles: ['owner'],
  manageAssignmentRules: ['owner'],
  startExit: ['owner', 'manager'],
  viewPerformance: ['owner', 'manager'],
  viewAudit: ['owner', 'manager'],
  exportAudit: ['owner'],
  revokeSession: ['owner'],
};

export function can(role: RoleKey, capability: Capability): boolean {
  return capabilityRoles[capability].includes(role);
}
