import type { RoleKey } from '@crm/mock-data';
import type { CallingNumber, CallingNumberCapabilities } from './types';

/**
 * Calling capability model (SKILL.md "Roles/permissions"). Hide actions a
 * role can never perform; disable contextually unavailable ones with a
 * reason (handled by each screen, not here).
 */
export type CallingCapability =
  | 'calling.view'
  | 'calling.call'
  | 'calling.log_outcome'
  | 'calling.follow_up'
  | 'calling.assign'
  | 'calling.bulk_assign'
  | 'calling.create_list'
  | 'calling.view_team'
  | 'calling.view_analytics'
  | 'calling.export'
  | 'calling.view_cost'
  | 'calling.view_recording'
  | 'calling.configure_provider';

const capabilityRoles: Record<CallingCapability, RoleKey[]> = {
  'calling.view': ['owner', 'manager', 'agent'],
  'calling.call': ['owner', 'manager', 'agent'],
  'calling.log_outcome': ['owner', 'manager', 'agent'],
  'calling.follow_up': ['owner', 'manager', 'agent'],
  'calling.assign': ['owner', 'manager'],
  'calling.bulk_assign': ['owner', 'manager'],
  'calling.create_list': ['owner', 'manager'],
  'calling.view_team': ['owner', 'manager'],
  'calling.view_analytics': ['owner', 'manager'],
  'calling.export': ['owner', 'manager'],
  'calling.view_cost': ['owner', 'manager'],
  'calling.view_recording': ['owner', 'manager'],
  'calling.configure_provider': ['owner'],
};

export function can(role: RoleKey, capability: CallingCapability): boolean {
  return capabilityRoles[capability].includes(role);
}

/**
 * Only a manager/admin may create a parallel future task with a reason when a
 * duplicate follow-up already exists (SKILL.md "Follow-up duplicate
 * prevention"). Agents may only keep or reschedule the existing one.
 */
export function canCreateParallelFollowUp(role: RoleKey): boolean {
  return role === 'owner' || role === 'manager';
}

/** Deterministic "no provider connected" capability set — core must work here. */
export const NO_PROVIDER_CAPABILITIES: CallingNumberCapabilities = {
  clickToCall: false,
  callStatusEvents: false,
  durationEvents: false,
  costData: false,
  inboundCalls: false,
  recording: false,
  transcript: false,
  voiceAI: false,
};

export function providerCapabilitiesFor(number: CallingNumber | undefined): CallingNumberCapabilities {
  if (!number || !number.providerConnected) return NO_PROVIDER_CAPABILITIES;
  return number.capabilities;
}
