import type { RoleKey, UserAvailability } from '@crm/mock-data';

/**
 * Team & Access domain model (TEAM_ACCESS_GENERATION_SPEC.md §16, adapter §2).
 *
 * `User`/`Team`/`Branch`/`WhatsAppNumber` from `@crm/mock-data` stay the shared
 * identity/tenant records. Team & Access layers its own administration model
 * on top: a richer `TeamMember` record (employment/invite lifecycle, scoped
 * access, capacity), a 6-role permission model distinct from the shell's
 * 3-value acting `RoleKey`, and the operational entities (assignment rules,
 * workload, transfers, audit) this module owns.
 */

export type EmploymentStatus = 'pending' | 'active' | 'inactive';
export type InviteStatus = 'none' | 'pending' | 'expired';

export type WorkType = 'conversation' | 'call' | 'lead' | 'task' | 'follow_up';

export const workTypes: WorkType[] = ['conversation', 'call', 'lead', 'task', 'follow_up'];

export const workTypeLabels: Record<WorkType, string> = {
  conversation: 'Conversations',
  call: 'Calls',
  lead: 'Leads',
  task: 'Tasks',
  follow_up: 'Follow-ups',
};

export interface CapacityState {
  current: number;
  max: number | null;
}

/**
 * A member of the organisation as Team & Access manages them. `userId` links
 * to the shared `User` record when this person can also act as the signed-in
 * user in the shell simulation (owner/manager/agent); most fixture members
 * are administration-only records with `userId: null`.
 */
export interface TeamMember {
  id: string;
  userId: string | null;
  name: string;
  initials: string;
  email: string;
  mobile: string;
  employmentStatus: EmploymentStatus;
  inviteStatus: InviteStatus;
  roleId: string;
  branchIds: string[];
  departmentIds: string[];
  teamIds: string[];
  numberAccess: string[];
  defaultNumberId: string | null;
  availability: UserAvailability;
  capacityByWorkType: Record<WorkType, CapacityState>;
  managerId: string | null;
  title: string;
  invitedAt: string | null;
  joinedAt: string | null;
  lastActivityAt: string | null;
  twoFactorEnabled: boolean;
  activeSessionCount: number;
}

export interface Department {
  id: string;
  name: string;
}

/**
 * Team & Access's administrative overlay on the shared `Team`/`Branch`
 * identity records — the shared types only carry `{id, name, branchId}` /
 * `{id, name, city}`; this module owns lead/coverage/cross-branch facts.
 */
export interface TeamRecord {
  id: string;
  branchIds: string[];
  crossBranch: boolean;
  departmentId: string | null;
  leadId: string | null;
  memberIds: string[];
  numberIds: string[];
}

export interface BranchRecord {
  id: string;
  managerIds: string[];
  teamIds: string[];
  numberIds: string[];
}

/** One grouped module-action permission (Role Detail progressive disclosure). */
export interface PermissionAction {
  id: string;
  label: string;
  granted: boolean;
}

export interface PermissionGroup {
  id: string;
  label: string;
  actions: PermissionAction[];
}

export type RoleRisk = 'standard' | 'elevated' | 'high';
export type RecordScopeLevel = 'workspace' | 'branch' | 'team' | 'own';

export interface DataProtectionPolicy {
  maskPhone: boolean;
  maskEmail: boolean;
  allowCopy: boolean;
  allowDownload: boolean;
  allowExport: boolean;
  exceptions: string[];
}

/**
 * The six represented roles (SKILL.md "Roles / permission UX"), mapped onto
 * the shell's 3-value acting `RoleKey` so the acting-as simulation stays
 * consistent with every other module (`?role=owner|manager|agent`).
 */
export interface Role {
  id: string;
  name: string;
  kind: 'standard' | 'custom';
  actingRoleKey: RoleKey;
  description: string;
  recordScopeLevel: RecordScopeLevel;
  recordScopeSummary: string;
  risk: RoleRisk;
  lastChangedAt: string;
  lastChangedBy: string;
  permissionGroups: PermissionGroup[];
  dataProtection: DataProtectionPolicy;
  isLastOwnerProtected: boolean;
}

/** Who/what a number, branch or team default resolves to. */
export interface AccessGrant {
  id: string;
  subjectType: 'user' | 'team' | 'branch';
  subjectId: string;
  numberId: string;
  canSend: boolean;
  canReceive: boolean;
  isDefault: boolean;
}

export type AssignmentStrategy = 'owner_first_round_robin' | 'round_robin' | 'named_user' | 'named_team';

export interface AssignmentCondition {
  id: string;
  field: 'number' | 'branch' | 'team' | 'customer_type' | 'language' | 'city' | 'tag' | 'source';
  operator: 'is' | 'is_not' | 'in';
  value: string;
}

export interface AssignmentRule {
  id: string;
  name: string;
  scope: { branchId: string | null; numberId: string | null };
  priority: number;
  conditions: AssignmentCondition[];
  strategy: AssignmentStrategy;
  ownerFirst: boolean;
  eligibleTeamIds: string[];
  eligibleUserIds: string[];
  respectCapacity: boolean;
  fallbackQueueId: string | null;
  status: 'draft' | 'active' | 'paused';
  version: number;
  lastEditedAt: string;
  lastEditedBy: string;
  unmatchedLast7d: number;
}

export interface FallbackQueue {
  id: string;
  name: string;
  scope: string;
  waiting: number;
  oldestWaitMinutes: number;
  slaRisk: 'none' | 'watch' | 'breach';
  memberIds: string[];
}

export type EscalationReason = 'sla_breach' | 'urgent' | 'high_value' | 'complaint' | 'manual_handover';

export interface Escalation {
  id: string;
  reason: EscalationReason;
  contactId: string | null;
  contactName: string;
  conversationId: string | null;
  currentOwnerId: string | null;
  currentAssigneeId: string | null;
  receivingTeamId: string | null;
  slaMinutesRemaining: number | null;
  handoverNoteComplete: boolean;
  createdAt: string;
  status: 'pending' | 'accepted' | 'reviewed';
}

export type TransferEntityType = 'conversation' | 'contact' | 'company' | 'call' | 'task' | 'follow_up';

export interface TransferGroupCount {
  entityType: TransferEntityType;
  count: number;
}

export type TransferOwnershipMode = 'current_work_only' | 'current_work_and_ownership';

export interface TransferResultLine {
  entityType: TransferEntityType;
  succeeded: number;
  failed: number;
  skipped: number;
  reasons: string[];
}

export interface TransferBatch {
  id: string;
  sourceMemberId: string | null;
  groups: TransferGroupCount[];
  recipientType: 'user' | 'team' | 'queue';
  recipientId: string;
  ownershipMode: TransferOwnershipMode;
  note: string;
  createdAt: string;
  createdBy: string;
  status: 'completed' | 'partial' | 'failed';
  results: TransferResultLine[];
}

export type AuditEventType =
  | 'member'
  | 'role_access'
  | 'number_access'
  | 'assignment_ownership'
  | 'export'
  | 'security_session'
  | 'offboarding';

export interface AuditEvent {
  id: string;
  actorId: string;
  actorName: string;
  targetType: 'member' | 'role' | 'team' | 'branch' | 'number' | 'rule' | 'record';
  targetId: string;
  targetLabel: string;
  type: AuditEventType;
  summary: string;
  before: string | null;
  after: string | null;
  reason: string | null;
  branchId: string | null;
  numberId: string | null;
  sourceIp: string | null;
  sessionLabel: string | null;
  timestamp: string;
  relatedEventIds: string[];
  sensitive: boolean;
}

export interface WorkloadSummary {
  memberId: string;
  openConversations: number;
  overdueConversations: number;
  callsDue: number;
  callsOverdue: number;
  leadsOpen: number;
  tasksOpen: number;
  followUpsOpen: number;
  ownedContacts: number;
  attention: 'none' | 'overloaded' | 'unavailable_with_work' | 'underutilised';
}

export interface PerformanceSnapshot {
  memberId: string;
  assigned: number;
  replied: number;
  resolved: number;
  overdue: number;
  firstResponseMinutes: number | null;
  resolutionHours: number | null;
  followUpCompletionRate: number | null;
  callsHandled: number;
  dataAvailable: boolean;
}

export type ExitDependencyCategory =
  | 'roles_memberships'
  | 'number_access'
  | 'sessions_tokens'
  | 'owned_contacts'
  | 'conversations'
  | 'calls'
  | 'tasks_follow_ups'
  | 'approvals'
  | 'campaign_workflow';

export interface ExitDependency {
  category: ExitDependencyCategory;
  label: string;
  count: number;
  transferRequired: boolean;
  defaultRecipientId: string | null;
  defaultRecipientType: 'user' | 'team' | null;
  status: 'pending' | 'mapped' | 'transferred' | 'failed';
}
