import { findBranch, findTeam, findWhatsAppNumber } from '@crm/mock-data';
import {
  accessGrants,
  assignmentRules,
  auditEvents,
  branchRecords,
  escalations,
  fallbackQueues,
  findRole,
  findTeamRecord,
  teamMembers,
  workloadSummaries,
} from './team-access-mock-data';
import type { TeamMember } from './team-access-types';

export interface OverviewStats {
  activeCount: number;
  pendingCount: number;
  inactiveCount: number;
  unassignedWork: number;
  overloadedCount: number;
  unavailableWithWorkCount: number;
  numberIssueCount: number;
  exitAttentionCount: number;
}

/** Scope filter shared across every Overview/People/Structure computation. */
export interface ScopeFilter {
  branchId?: string | null;
  teamId?: string | null;
}

function inScope(member: TeamMember, scope: ScopeFilter): boolean {
  if (scope.branchId && !member.branchIds.includes(scope.branchId)) return false;
  if (scope.teamId && !member.teamIds.includes(scope.teamId)) return false;
  return true;
}

export function overviewStats(scope: ScopeFilter = {}): OverviewStats {
  const scoped = teamMembers.filter((m) => inScope(m, scope));
  const scopedIds = new Set(scoped.map((m) => m.id));

  const overloaded = workloadSummaries.filter((w) => w.attention === 'overloaded' && scopedIds.has(w.memberId));
  const unavailableWithWork = workloadSummaries.filter(
    (w) => w.attention === 'unavailable_with_work' && scopedIds.has(w.memberId),
  );
  const numberIssue = scoped.filter((m) => m.employmentStatus === 'active' && m.numberAccess.length === 0);

  return {
    activeCount: scoped.filter((m) => m.employmentStatus === 'active').length,
    pendingCount: scoped.filter((m) => m.employmentStatus === 'pending').length,
    inactiveCount: scoped.filter((m) => m.employmentStatus === 'inactive').length,
    unassignedWork: fallbackQueues.reduce((sum, q) => sum + q.waiting, 0),
    overloadedCount: overloaded.length,
    unavailableWithWorkCount: unavailableWithWork.length,
    numberIssueCount: numberIssue.length,
    exitAttentionCount: auditEvents.filter((e) => e.type === 'offboarding' && e.summary.includes('manual follow-up')).length,
  };
}

export interface PeopleFilters {
  search?: string;
  status?: 'active' | 'pending' | 'inactive' | null;
  branchId?: string | null;
  teamId?: string | null;
  roleId?: string | null;
  numberId?: string | null;
}

export function filterMembers(filters: PeopleFilters): TeamMember[] {
  const search = filters.search?.trim().toLowerCase();
  return teamMembers.filter((member) => {
    if (filters.status && member.employmentStatus !== filters.status) return false;
    if (filters.branchId && !member.branchIds.includes(filters.branchId)) return false;
    if (filters.teamId && !member.teamIds.includes(filters.teamId)) return false;
    if (filters.roleId && member.roleId !== filters.roleId) return false;
    if (filters.numberId && !member.numberAccess.includes(filters.numberId)) return false;
    if (search) {
      const haystack = `${member.name} ${member.email} ${member.title}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

export function memberBranchLabel(member: TeamMember): string {
  return member.branchIds.map((id) => findBranch(id)?.name ?? id).join(', ') || '—';
}

export function memberTeamLabel(member: TeamMember): string {
  return member.teamIds.map((id) => findTeam(id)?.name ?? id).join(', ') || '—';
}

export function memberRoleLabel(member: TeamMember): string {
  return findRole(member.roleId)?.name ?? member.roleId;
}

export function memberNumberCue(member: TeamMember): string {
  if (member.numberAccess.length === 0) return 'No number access';
  if (member.numberAccess.length === 1) {
    const number = findWhatsAppNumber(member.numberAccess[0]);
    return number ? number.displayName : member.numberAccess[0];
  }
  return `${member.numberAccess.length} numbers`;
}

export function memberLastActivityLabel(member: TeamMember): string {
  if (member.employmentStatus === 'pending') {
    return member.inviteStatus === 'expired' ? 'Invite expired' : 'Invitation pending';
  }
  if (!member.lastActivityAt) return 'No activity yet';
  return new Date(member.lastActivityAt).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isDuplicateActive(email: string): TeamMember | undefined {
  const normalized = email.trim().toLowerCase();
  return teamMembers.find((m) => m.email.toLowerCase() === normalized && m.employmentStatus === 'active');
}

export function isReactivatable(email: string): TeamMember | undefined {
  const normalized = email.trim().toLowerCase();
  return teamMembers.find((m) => m.email.toLowerCase() === normalized && m.employmentStatus === 'inactive');
}

export function isPendingExisting(email: string): TeamMember | undefined {
  const normalized = email.trim().toLowerCase();
  return teamMembers.find((m) => m.email.toLowerCase() === normalized && m.employmentStatus === 'pending');
}

/** Deterministic seat-limit fixture: workspace plan allows exactly this many seats. */
export const SEAT_LIMIT = 12;

export function seatsUsed(): number {
  return teamMembers.filter((m) => m.employmentStatus !== 'inactive').length;
}

export function accessGrantsForNumber(numberId: string) {
  return accessGrants.filter((g) => g.numberId === numberId);
}

export function escalationsPending() {
  return escalations.filter((e) => e.status === 'pending');
}

/* ------------------------------------------------------------------------ */
/* Structure                                                                 */
/* ------------------------------------------------------------------------ */

export interface TeamWorkloadAggregate {
  openConversations: number;
  overdueConversations: number;
  attentionCount: number;
}

export function teamWorkloadAggregate(teamId: string): TeamWorkloadAggregate {
  const record = findTeamRecord(teamId);
  const memberIds = new Set(record?.memberIds ?? []);
  const rows = workloadSummaries.filter((w) => memberIds.has(w.memberId));
  return {
    openConversations: rows.reduce((sum, w) => sum + w.openConversations, 0),
    overdueConversations: rows.reduce((sum, w) => sum + w.overdueConversations, 0),
    attentionCount: rows.filter((w) => w.attention !== 'none').length,
  };
}

export function teamQueueHealth(teamId: string) {
  return fallbackQueues.find((q) => q.name.toLowerCase().includes(findTeam(teamId)?.name.split(' ')[0].toLowerCase() ?? '__none__'));
}

export function teamActiveMemberCount(teamId: string): number {
  const record = findTeamRecord(teamId);
  if (!record) return 0;
  return record.memberIds.filter((id) => teamMembers.find((m) => m.id === id)?.employmentStatus === 'active').length;
}

export function branchWorkloadAttentionCount(branchId: string): number {
  const memberIds = new Set(teamMembers.filter((m) => m.branchIds.includes(branchId)).map((m) => m.id));
  return workloadSummaries.filter((w) => memberIds.has(w.memberId) && w.attention !== 'none').length;
}

export function branchUserCount(branchId: string): number {
  return teamMembers.filter((m) => m.branchIds.includes(branchId) && m.employmentStatus === 'active').length;
}

export function usersForRole(roleId: string): TeamMember[] {
  return teamMembers.filter((m) => m.roleId === roleId && m.employmentStatus !== 'inactive');
}

export function ownerRoleUserCount(): number {
  return usersForRole('role_owner').length;
}

export function rulesForTeam(teamId: string) {
  return assignmentRules.filter((r) => r.eligibleTeamIds.includes(teamId) || (r.scope.branchId && findTeamRecord(teamId)?.branchIds.includes(r.scope.branchId)));
}

/* ------------------------------------------------------------------------ */
/* Assignment rule validation                                               */
/* ------------------------------------------------------------------------ */

/** Rules sharing scope (branch + number) and priority — an unresolved tie the engine can't order. */
export function conflictingRules(rule: { id: string; scope: { branchId: string | null; numberId: string | null }; priority: number }) {
  return assignmentRules.filter(
    (other) =>
      other.id !== rule.id &&
      other.scope.branchId === rule.scope.branchId &&
      other.scope.numberId === rule.scope.numberId &&
      other.priority === rule.priority,
  );
}

export function rulesWithConflicts() {
  return assignmentRules.filter((rule) => conflictingRules(rule).length > 0);
}

export function rulesWithoutFallback() {
  return assignmentRules.filter((rule) => rule.status === 'active' && !rule.fallbackQueueId);
}

/**
 * "Obvious loop" guard (adapter §H). This model has no rule-to-rule chaining
 * — a fallback always lands in a terminal queue, never another rule — so a
 * classic A-falls-back-to-B-falls-back-to-A cycle can't be constructed here.
 * The realistic equivalent: the eligible pool and the fallback queue resolve
 * to the exact same people, so "falling back" never actually reaches anyone
 * the primary match didn't already exclude — unmatched work bounces in place
 * instead of finding a new destination.
 */
export function rulesWithLoopRisk() {
  return assignmentRules.filter((rule) => {
    if (!rule.fallbackQueueId) return false;
    const queue = fallbackQueues.find((q) => q.id === rule.fallbackQueueId);
    if (!queue || queue.memberIds.length === 0) return false;
    const pool = new Set(
      rule.eligibleUserIds.length > 0
        ? rule.eligibleUserIds
        : rule.eligibleTeamIds.flatMap((teamId) => findTeamRecord(teamId)?.memberIds ?? []),
    );
    if (pool.size === 0) return false;
    return queue.memberIds.every((memberId) => pool.has(memberId));
  });
}

export { branchRecords };

