import { findWhatsAppNumber } from '@crm/mock-data';
import { findMember, findRole, findTeamRecord, findWorkload, workloadSummaries } from './team-access-mock-data';
import type { AssignmentRule, Role, TeamMember, WorkType } from './team-access-types';

/**
 * Effective-access resolver (adapter §3). One deterministic place that turns
 * a member's role + scope + number access into what they can see/do, so no
 * screen re-derives permission logic on its own.
 */
export interface EffectiveAccess {
  member: TeamMember;
  role: Role;
  allowedActions: string[];
  recordScopeSummary: string;
  numberScope: { id: string; label: string; isDefault: boolean }[];
  maskedFields: string[];
  canBeRemovedAsLastOwner: boolean;
}

export function resolveEffectiveAccess(memberId: string): EffectiveAccess | null {
  const member = findMember(memberId);
  if (!member) return null;
  const role = findRole(member.roleId);
  if (!role) return null;

  const allowedActions = role.permissionGroups.flatMap((group) =>
    group.actions.filter((action) => action.granted).map((action) => `${group.label} → ${action.label}`),
  );

  const numberScope = member.numberAccess.map((numberId) => {
    const number = findWhatsAppNumber(numberId);
    return {
      id: numberId,
      label: number ? `${number.displayName} (${number.displayNumber})` : numberId,
      isDefault: numberId === member.defaultNumberId,
    };
  });

  const maskedFields: string[] = [];
  if (role.dataProtection.maskPhone) maskedFields.push('phone');
  if (role.dataProtection.maskEmail) maskedFields.push('email');

  return {
    member,
    role,
    allowedActions,
    recordScopeSummary: role.recordScopeSummary,
    numberScope,
    maskedFields,
    canBeRemovedAsLastOwner: !role.isLastOwnerProtected,
  };
}

/**
 * Assignment-eligibility resolver (adapter §4). Used for manual assignment,
 * bulk redistribution, routing simulation and offboarding transfer so every
 * one of those flows agrees on who is eligible to receive work and why not.
 */
export interface EligibilityContext {
  numberId?: string;
  branchId?: string;
  teamId?: string;
  workType?: WorkType;
}

export interface EligibilityResult {
  memberId: string;
  eligible: boolean;
  reasons: string[];
}

export function resolveEligibility(memberId: string, context: EligibilityContext): EligibilityResult {
  const member = findMember(memberId);
  const reasons: string[] = [];

  if (!member) {
    return { memberId, eligible: false, reasons: ['Member not found.'] };
  }

  if (member.employmentStatus !== 'active') {
    reasons.push(`Employment status is ${member.employmentStatus === 'pending' ? 'pending' : 'inactive'}.`);
  }

  if (context.numberId && !member.numberAccess.includes(context.numberId)) {
    reasons.push('No access to the required WhatsApp number.');
  }

  if (context.branchId && !member.branchIds.includes(context.branchId)) {
    reasons.push('Not scoped to the required branch.');
  }

  if (context.teamId && !member.teamIds.includes(context.teamId)) {
    reasons.push('Not a member of the required team.');
  }

  if (member.availability === 'offline' || member.availability === 'away') {
    reasons.push(`Marked ${member.availability} — new work will not be routed to them.`);
  }

  if (context.workType) {
    const capacity = member.capacityByWorkType[context.workType];
    if (capacity.max !== null && capacity.current >= capacity.max) {
      reasons.push(`At or over capacity for ${context.workType.replace('_', ' ')} (${capacity.current}/${capacity.max}).`);
    }
  }

  return { memberId, eligible: reasons.length === 0, reasons };
}

/** Convenience wrapper used by Overview/Work Distribution attention cards. */
export function workloadAttentionCount(attention: 'overloaded' | 'unavailable_with_work'): number {
  return workloadSummaries.filter((w) => w.attention === attention).length;
}

/**
 * Assignment Rule simulation trace (SKILL.md "Assignment Rule Builder" —
 * matched rule → excluded users → selected destination → fallback). Reused
 * by both the rule wizard's Test step and the standalone Test drawer so the
 * two never disagree about what a rule would do.
 */
export interface RuleSimulationResult {
  eligiblePoolIds: string[];
  excluded: { memberId: string; reasons: string[] }[];
  selectedMemberId: string | null;
  usedFallback: boolean;
  fallbackQueueId: string | null;
}

export function simulateAssignmentRule(
  rule: Pick<AssignmentRule, 'scope' | 'eligibleUserIds' | 'eligibleTeamIds' | 'fallbackQueueId'>,
  context: EligibilityContext = {},
): RuleSimulationResult {
  const pool =
    rule.eligibleUserIds.length > 0
      ? rule.eligibleUserIds
      : rule.eligibleTeamIds.flatMap((teamId) => findTeamRecord(teamId)?.memberIds ?? []);
  const eligiblePoolIds = Array.from(new Set(pool));

  const resolved = eligiblePoolIds.map((memberId) =>
    resolveEligibility(memberId, {
      ...context,
      numberId: context.numberId ?? rule.scope.numberId ?? undefined,
      branchId: context.branchId ?? rule.scope.branchId ?? undefined,
    }),
  );

  const eligible = resolved.filter((r) => r.eligible);
  const excluded = resolved.filter((r) => !r.eligible).map((r) => ({ memberId: r.memberId, reasons: r.reasons }));
  const selectedMemberId = eligible[0]?.memberId ?? null;

  return {
    eligiblePoolIds,
    excluded,
    selectedMemberId,
    usedFallback: selectedMemberId === null,
    fallbackQueueId: rule.fallbackQueueId,
  };
}

export { findWorkload };
