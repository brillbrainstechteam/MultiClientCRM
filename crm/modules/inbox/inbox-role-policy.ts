/**
 * Inbox role capabilities — maps each RoleKey to the operational permissions
 * that drive UI show/hide and enable/disable behavior (SKILL.md §permissions).
 *
 * Sensitive capabilities must not leak through counts or partial UI exposure.
 */

import type { RoleKey } from '@crm/mock-data';
import type { InboxRoleCapabilities } from './inbox-types';

const OWNER: InboxRoleCapabilities = {
  canReassign: true,
  canAssignToAny: true,
  canMarkSpam: true,
  canExport: true,
  canViewAnalytics: true,
  canSeeAgentPerformance: true,
  canBulkAction: true,
  canHandoffBot: true,          // Phase 2 gated in UI
  canViewAllConversations: true,
  canApproveAiTasks: true,
};

const MANAGER: InboxRoleCapabilities = {
  canReassign: true,
  canAssignToAny: true,
  canMarkSpam: true,
  canExport: true,
  canViewAnalytics: true,
  canSeeAgentPerformance: true,
  canBulkAction: true,
  canHandoffBot: true,
  canViewAllConversations: true,
  canApproveAiTasks: true,
};

const AGENT: InboxRoleCapabilities = {
  canReassign: false,           // agents cannot reassign to others
  canAssignToAny: false,        // only sees own team
  canMarkSpam: false,
  canExport: false,
  canViewAnalytics: false,
  canSeeAgentPerformance: false,
  canBulkAction: true,          // limited bulk: resolve, follow-up, labels
  canHandoffBot: false,
  canViewAllConversations: false,
  canApproveAiTasks: true,      // agents approve tasks for their own conversations
};

const ROLE_POLICIES: Record<RoleKey, InboxRoleCapabilities> = {
  owner: OWNER,
  manager: MANAGER,
  agent: AGENT,
};

export function inboxPolicyFor(role: RoleKey): InboxRoleCapabilities {
  return ROLE_POLICIES[role];
}
