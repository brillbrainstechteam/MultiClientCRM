import { findTeam } from '@crm/mock-data';
import type { AgentSafetyPolicy, AgentTestRun, AiAgent, KnowledgeSource, StandardTestCategory, TestRunAction, TestRunSourceRef } from './types';

/**
 * Deterministic Test Lab response simulator (SKILL.md "Prototype limitations"
 * — no real LLM/RAG; simulate deterministic states only). Categorises a
 * customer message with simple keyword heuristics, matching the same seven
 * standard-test behaviours everywhere else in the module.
 */

const restrictedKeywords = ['legal', 'court', 'dispute', 'lawsuit', 'competitor'];
const sensitiveKeywords = ['discount', 'refund', 'quote', 'quotation', 'off', 'price match', 'payment'];
const humanKeywords = ['human', 'real person', 'talk to someone', 'agent please', 'connect me'];
const missingDataKeywords = ['right now', 'exact status', 'live', 'currently'];

export function categoriseMessage(message: string, safety: AgentSafetyPolicy): StandardTestCategory {
  const text = message.toLowerCase();
  if (safety.restrictedTopics.some((topic) => text.includes(topic.toLowerCase().split(' ')[0]))) return 'restricted-topic';
  if (restrictedKeywords.some((k) => text.includes(k))) return 'restricted-topic';
  if (humanKeywords.some((k) => text.includes(k))) return 'human-request';
  if (sensitiveKeywords.some((k) => text.includes(k))) return 'sensitive-action';
  if (missingDataKeywords.some((k) => text.includes(k))) return 'missing-integration';
  return 'approved-faq';
}

export interface SimulationResult {
  agentResponse: string;
  sources: TestRunSourceRef[];
  actions: TestRunAction[];
  approvalState: AgentTestRun['approvalState'];
  handoverTriggered: boolean;
  result: 'pass' | 'fail';
}

export function simulateResponse(
  _agent: AiAgent,
  category: StandardTestCategory,
  message: string,
  sources: KnowledgeSource[],
  safety: AgentSafetyPolicy,
): SimulationResult {
  const readySource = sources.find((s) => s.status === 'ready');
  const teamName = safety.handover.defaultTeamId ? findTeam(safety.handover.defaultTeamId)?.name : undefined;

  switch (category) {
    case 'approved-faq':
    case 'source-reference':
      if (!readySource) {
        return {
          agentResponse: `I don't have an approved source for that yet, so I'm connecting you with ${teamName ?? 'a team member'} to help.`,
          sources: [],
          actions: [{ kind: 'safe-stop', label: 'Safe stop', detail: 'No ready knowledge source available.' }, { kind: 'handover', label: 'Handed over', detail: teamName ?? 'No handover destination configured.' }],
          approvalState: 'not-required',
          handoverTriggered: true,
          result: teamName ? 'pass' : 'fail',
        };
      }
      return {
        agentResponse: `Based on ${readySource.name}: ${readySource.preview || 'here is the relevant information.'}`,
        sources: [{ sourceId: readySource.id, sourceName: readySource.name, type: readySource.type }],
        actions: [{ kind: 'reply', label: 'Reply sent', detail: `Answered from ${readySource.name}.` }],
        approvalState: 'not-required',
        handoverTriggered: false,
        result: 'pass',
      };

    case 'unknown-handover':
    case 'missing-integration':
      return {
        agentResponse: `I can't confirm that right now, so I'm connecting you with ${teamName ?? 'a team member'} who can help.`,
        sources: [],
        actions: [{ kind: 'safe-stop', label: 'Safe stop', detail: 'Required information unavailable.' }, { kind: 'handover', label: 'Handed over', detail: teamName ?? 'No handover destination configured.' }],
        approvalState: 'not-required',
        handoverTriggered: true,
        result: teamName ? 'pass' : 'fail',
      };

    case 'restricted-topic':
      return {
        agentResponse: `I'm not able to help with that directly — connecting you with ${teamName ?? 'a team member'} now.`,
        sources: [],
        actions: [{ kind: 'handover', label: 'Handed over', detail: 'Restricted topic.' }],
        approvalState: 'not-required',
        handoverTriggered: true,
        result: teamName ? 'pass' : 'fail',
      };

    case 'sensitive-action': {
      const action = safety.sensitiveActions.find((a) => message.toLowerCase().includes(a.key.split('-')[0])) ?? safety.sensitiveActions[0];
      return {
        agentResponse: action?.requiresApproval
          ? `I've drafted that for you — it needs a quick approval before I can confirm it.`
          : `Sure — here's what I can offer.`,
        sources: [],
        actions: [{ kind: 'approval-request', label: `${action?.label ?? 'Sensitive action'} approval requested`, detail: 'Awaiting human approval.' }],
        approvalState: action?.requiresApproval ? 'pending' : 'not-required',
        handoverTriggered: false,
        result: 'pass',
      };
    }

    case 'human-request':
      return {
        agentResponse: `Of course — connecting you with ${teamName ?? 'a team member'} now.`,
        sources: [],
        actions: [{ kind: 'handover', label: 'Handed over', detail: 'Customer asked for a human.' }],
        approvalState: 'not-required',
        handoverTriggered: true,
        result: teamName ? 'pass' : 'fail',
      };

    default:
      return {
        agentResponse: `I'm not sure — connecting you with ${teamName ?? 'a team member'}.`,
        sources: [],
        actions: [{ kind: 'handover', label: 'Handed over', detail: 'Unhandled case.' }],
        approvalState: 'not-required',
        handoverTriggered: true,
        result: 'fail',
      };
  }
}
