import type { AgentSafetyPolicy, AgentTestCase, AiAgent, KnowledgeSource } from './types';

/**
 * Single deterministic readiness resolver (CODE_FIRST_ADAPTER.md §3). Every
 * screen — Library badges, Setup checklist, Activate modal — reads from this
 * instead of re-deriving its own rules.
 */

export interface ReadinessBlocker {
  id: string;
  label: string;
  /** Query-string tab/step this blocker should deep-link to. */
  to: 'purpose' | 'knowledge' | 'safety' | 'test';
}

export interface ReadinessResult {
  purposeComplete: boolean;
  knowledgeReady: boolean;
  safetyConfigured: boolean;
  handoverConfigured: boolean;
  dataAccessReviewed: boolean;
  requiredTestsPassed: boolean;
  readyToTest: boolean;
  readyToActivate: boolean;
  blockers: ReadinessBlocker[];
}

export function isPurposeComplete(agent: AiAgent): boolean {
  return Boolean(
    agent.name.trim() &&
      agent.objective.trim() &&
      agent.responsibilities.length > 0 &&
      agent.instructions.trim() &&
      agent.tone.trim() &&
      agent.supportedLanguages.length > 0,
  );
}

export function isKnowledgeReady(agent: AiAgent, sources: KnowledgeSource[]): boolean {
  const agentSources = sources.filter((source) => source.agentId === agent.id);
  if (agentSources.length === 0) return false;
  return agentSources.some((source) => source.status === 'ready');
}

export function isSafetyConfigured(safety: AgentSafetyPolicy): boolean {
  return safety.dataAccess.length > 0 && safety.sensitiveActions.length > 0;
}

export function isHandoverConfigured(safety: AgentSafetyPolicy): boolean {
  return Boolean(safety.handover.defaultTeamId);
}

export function resolveReadiness(
  agent: AiAgent,
  sources: KnowledgeSource[],
  safety: AgentSafetyPolicy,
  testCases: AgentTestCase[],
): ReadinessResult {
  const purposeComplete = isPurposeComplete(agent);
  const knowledgeReady = isKnowledgeReady(agent, sources);
  const safetyConfigured = isSafetyConfigured(safety);
  const handoverConfigured = isHandoverConfigured(safety);
  const dataAccessReviewed = safety.dataAccessReviewed;

  const requiredCases = testCases.filter((tc) => tc.agentId === agent.id && tc.required);
  const requiredTestsPassed =
    requiredCases.length > 0 && requiredCases.every((tc) => tc.latestResult === 'pass');

  const blockers: ReadinessBlocker[] = [];
  if (!purposeComplete) {
    blockers.push({ id: 'purpose', label: 'Complete agent purpose (name, objective, instructions, tone, languages).', to: 'purpose' });
  }
  if (!knowledgeReady) {
    blockers.push({ id: 'knowledge', label: 'Add at least one approved knowledge source.', to: 'knowledge' });
  }
  if (!safetyConfigured) {
    blockers.push({ id: 'safety', label: 'Configure sensitive-action approvals and data access.', to: 'safety' });
  }
  if (!handoverConfigured) {
    blockers.push({ id: 'handover', label: 'Set a human handover destination.', to: 'safety' });
  }
  if (!dataAccessReviewed) {
    blockers.push({ id: 'data-access', label: 'Review data access before activation.', to: 'safety' });
  }
  if (agent.hasBlockingSafetyIssues) {
    blockers.push({ id: 'critical-safety', label: 'Resolve the critical safety issue flagged on this agent.', to: 'safety' });
  }
  if (!requiredTestsPassed) {
    blockers.push({ id: 'tests', label: 'Pass every required standard test case in Test Lab.', to: 'test' });
  }
  if (agent.changedSinceTest) {
    blockers.push({ id: 'changed-since-test', label: 'Re-test — instructions, knowledge or safety changed since the last test run.', to: 'test' });
  }

  const readyToTest = purposeComplete && knowledgeReady && safetyConfigured && handoverConfigured;
  const readyToActivate = readyToTest && dataAccessReviewed && requiredTestsPassed && !agent.hasBlockingSafetyIssues && !agent.changedSinceTest;

  return {
    purposeComplete,
    knowledgeReady,
    safetyConfigured,
    handoverConfigured,
    dataAccessReviewed,
    requiredTestsPassed,
    readyToTest,
    readyToActivate,
    blockers,
  };
}
