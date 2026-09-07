import type { OnboardingRole } from '@crm/mock-data';

/**
 * Onboarding capability model (SKILL.md "Permissions"). Owner/Super Admin can
 * start Meta onboarding, activate plan and add/remove numbers. Client Admin
 * needs those permissions granted explicitly (modelled here as a narrower
 * default). Manager/Agent cannot perform connection or billing
 * administration. Provider Support gets technical/support access only — never
 * customer conversation or business data.
 */
export type Capability =
  | 'startConnection'
  | 'activatePlan'
  | 'manageNumbers'
  | 'manageTeamMapping'
  | 'viewBilling'
  | 'manageDisconnect'
  | 'accessProviderAdmin';

const capabilityRoles: Record<Capability, OnboardingRole[]> = {
  startConnection: ['owner', 'client_admin'],
  activatePlan: ['owner', 'client_admin'],
  manageNumbers: ['owner', 'client_admin'],
  manageTeamMapping: ['owner', 'client_admin', 'manager'],
  viewBilling: ['owner', 'client_admin'],
  manageDisconnect: ['owner', 'client_admin'],
  accessProviderAdmin: ['provider_support'],
};

export function can(role: OnboardingRole, capability: Capability): boolean {
  return capabilityRoles[capability].includes(role);
}
