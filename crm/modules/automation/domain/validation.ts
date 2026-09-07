/**
 * Deterministic frontend validation engine (CODE_FIRST_ADAPTER.md §5).
 * Pure functions only — no persistence, no timers. Re-run on every
 * meaningful edit and before Go Live.
 */

import type {
  AutomationFlow,
  DelayWaitConfig,
  FlowNode,
  HumanHandoverConfig,
  QuestionConfig,
  SendMessageConfig,
  SimpleBranchConfig,
  UpdateContactConfig,
  ValidationIssue,
} from './types';
import { terminalNodeTypes } from './types';

let issueSeq = 0;
function issue(partial: Omit<ValidationIssue, 'id'>): ValidationIssue {
  issueSeq += 1;
  return { id: `issue_${issueSeq}`, ...partial };
}

function findNode(flow: AutomationFlow, id: string | null | undefined): FlowNode | undefined {
  if (!id) return undefined;
  return flow.nodes.find((node) => node.id === id);
}

/** Every outgoing pointer a node exposes, tagged with its originating id for loop tracing. */
function outgoing(node: FlowNode): (string | null)[] {
  switch (node.type) {
    case 'simple_branch':
      return [...node.config.branches.map((b) => b.next), node.config.fallback.next];
    case 'end':
    case 'human_handover':
    case 'ai_agent_handoff':
    case 'advanced_condition':
    case 'random_split':
      return [];
    default:
      return [node.next];
  }
}

export function reachableIds(flow: AutomationFlow): Set<string> {
  const visited = new Set<string>();
  const queue: string[] = [flow.startNodeId];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = findNode(flow, id);
    if (!node) continue;
    for (const next of outgoing(node)) {
      if (next) queue.push(next);
    }
  }
  return visited;
}

/** DFS cycle detection restricted to the reachable subgraph (an "obvious loop"). */
function findLoopNodeIds(flow: AutomationFlow, reachable: Set<string>): Set<string> {
  const state = new Map<string, 'visiting' | 'done'>();
  const looped = new Set<string>();

  function visit(id: string) {
    const current = state.get(id);
    if (current === 'visiting') {
      looped.add(id);
      return;
    }
    if (current === 'done') return;
    state.set(id, 'visiting');
    const node = findNode(flow, id);
    if (node) {
      for (const next of outgoing(node)) {
        if (next) visit(next);
      }
    }
    state.set(id, 'done');
  }

  if (reachable.has(flow.startNodeId)) visit(flow.startNodeId);
  return looped;
}

function contentIssue(node: FlowNode): ValidationIssue | null {
  switch (node.type) {
    case 'send_message': {
      const config = node.config as SendMessageConfig;
      const hasContent =
        (config.mode === 'text' && !!config.text?.trim()) ||
        (config.mode === 'media' && !!config.mediaLabel) ||
        (config.mode === 'template' && !!config.templateId) ||
        (config.mode === 'interactive' && !!config.text?.trim() && (config.interactiveOptions?.length ?? 0) > 0);
      if (!hasContent) {
        return issue({
          severity: 'error',
          kind: 'missing-content',
          nodeId: node.id,
          title: `"${node.label}" has no message content`,
          reason: 'A Send Message block needs text, media, a template or interactive options before it can go live.',
          suggestedFix: 'Open the node and complete its message content.',
          blocking: true,
        });
      }
      return null;
    }
    case 'question': {
      const config = node.config as QuestionConfig;
      if (!config.prompt.trim()) {
        return issue({
          severity: 'error',
          kind: 'missing-content',
          nodeId: node.id,
          title: `"${node.label}" is missing a question`,
          reason: 'Ask Question needs prompt text so the customer knows what to answer.',
          suggestedFix: 'Add the question text.',
          blocking: true,
        });
      }
      if ((config.answerType === 'single_select' || config.answerType === 'multi_select') && (config.options?.length ?? 0) < 2) {
        return issue({
          severity: 'error',
          kind: 'invalid-config',
          nodeId: node.id,
          title: `"${node.label}" needs at least two options`,
          reason: 'Select-type questions require two or more answer options.',
          suggestedFix: 'Add answer options.',
          blocking: true,
        });
      }
      return null;
    }
    case 'update_contact': {
      const config = node.config as UpdateContactConfig;
      if (config.updates.length === 0) {
        return issue({
          severity: 'error',
          kind: 'invalid-config',
          nodeId: node.id,
          title: `"${node.label}" has no updates configured`,
          reason: 'Update Contact needs at least one field, tag, stage, owner, priority or follow-up change.',
          suggestedFix: 'Add at least one update.',
          blocking: true,
        });
      }
      return null;
    }
    case 'human_handover': {
      const config = node.config as HumanHandoverConfig;
      if (!config.targetId) {
        return issue({
          severity: 'error',
          kind: 'invalid-config',
          nodeId: node.id,
          title: `"${node.label}" has no handover target`,
          reason: 'Human Handover needs a user, team or branch to receive the conversation.',
          suggestedFix: 'Choose who this hands off to.',
          blocking: true,
        });
      }
      return null;
    }
    case 'ai_agent_handoff': {
      if (!node.config.agentId) {
        return issue({
          severity: 'error',
          kind: 'invalid-config',
          nodeId: node.id,
          title: `"${node.label}" has no AI Agent selected`,
          reason: 'Hand off to AI Agent needs an existing agent selected.',
          suggestedFix: 'Select an AI Agent.',
          blocking: true,
        });
      }
      return null;
    }
    case 'delay_wait': {
      const config = node.config as DelayWaitConfig;
      if (config.mode === 'duration' && (!config.durationValue || config.durationValue <= 0)) {
        return issue({
          severity: 'error',
          kind: 'invalid-config',
          nodeId: node.id,
          title: `"${node.label}" has no wait duration`,
          reason: 'Delay/Wait needs a duration greater than zero.',
          suggestedFix: 'Set a wait duration.',
          blocking: true,
        });
      }
      if (config.mode === 'until_datetime' && !config.untilDateTime) {
        return issue({
          severity: 'error',
          kind: 'invalid-config',
          nodeId: node.id,
          title: `"${node.label}" has no target date/time`,
          reason: 'Wait until date/time needs a specific date and time.',
          suggestedFix: 'Set the date/time to wait until.',
          blocking: true,
        });
      }
      if (config.mode === 'wait_for_reply' && !config.noResponseNext) {
        return issue({
          severity: 'error',
          kind: 'invalid-config',
          nodeId: node.id,
          title: `"${node.label}" has no no-response path`,
          reason: 'Waiting for a reply needs a path to take if the customer never responds.',
          suggestedFix: 'Choose what happens when there is no response.',
          blocking: true,
        });
      }
      return null;
    }
    case 'api_call':
    case 'webhook':
    case 'external_integration': {
      const available = node.config.available;
      if (!available) {
        return issue({
          severity: 'error',
          kind: 'integration-unavailable',
          nodeId: node.id,
          title: `"${node.label}" needs an integration connection`,
          reason: 'This Advanced block depends on an integration that is not yet connected for this workspace.',
          suggestedFix: 'Configure the integration in Settings / Integrations, or remove this block.',
          blocking: true,
        });
      }
      return null;
    }
    default:
      return null;
  }
}

/** Session-window risk: a send reachable after a long wait, without a template fallback configured. */
function sessionRiskIssues(flow: AutomationFlow, reachable: Set<string>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const node of flow.nodes) {
    if (!reachable.has(node.id) || node.type !== 'delay_wait') continue;
    const config = node.config as DelayWaitConfig;
    const longWait =
      (config.mode === 'duration' &&
        ((config.durationUnit === 'days' && (config.durationValue ?? 0) >= 1) ||
          (config.durationUnit === 'hours' && (config.durationValue ?? 0) >= 24))) ||
      config.mode === 'until_datetime' ||
      config.mode === 'wait_for_reply';
    if (!longWait) continue;

    const downstreamSend = findDownstreamInteractiveSend(flow, node.next ?? config.noResponseNext ?? null);
    if (downstreamSend && !config.templateFallbackId) {
      issues.push(
        issue({
          severity: 'warning',
          kind: 'session-risk',
          nodeId: node.id,
          title: `"${node.label}" may send outside the customer's open session`,
          reason:
            'This message can use an interactive message while the customer session is open. Use an approved template when the send may occur outside it.',
          suggestedFix: 'Configure an approved-template fallback on this wait.',
          blocking: false,
        }),
      );
    }
  }
  return issues;
}

function findDownstreamInteractiveSend(flow: AutomationFlow, startId: string | null, depth = 0): FlowNode | null {
  if (!startId || depth > 6) return null;
  const node = findNode(flow, startId);
  if (!node) return null;
  if (node.type === 'send_message' && (node.config.mode === 'interactive' || node.config.mode === 'text')) {
    return node;
  }
  if (node.type === 'delay_wait' || node.type === 'update_contact') {
    return findDownstreamInteractiveSend(flow, node.next, depth + 1);
  }
  return null;
}

export interface ValidationOptions {
  /** Other flows in the tenant, used for duplicate live-trigger detection. */
  allFlows: AutomationFlow[];
}

export function validateFlow(flow: AutomationFlow, options: ValidationOptions): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const reachable = reachableIds(flow);

  // Disconnected nodes.
  for (const node of flow.nodes) {
    if (!reachable.has(node.id)) {
      issues.push(
        issue({
          severity: 'error',
          kind: 'disconnected',
          nodeId: node.id,
          title: `"${node.label}" is disconnected from the flow`,
          reason: 'This node cannot be reached from the Start trigger, so it will never run.',
          suggestedFix: 'Connect it from another node, or delete it.',
          blocking: true,
        }),
      );
    }
  }

  // Missing next step / missing fallback / content completeness.
  for (const node of flow.nodes) {
    if (!reachable.has(node.id)) continue;

    if (node.type === 'simple_branch') {
      const config = node.config as SimpleBranchConfig;
      if (!config.fallback.next) {
        issues.push(
          issue({
            severity: 'error',
            kind: 'missing-fallback',
            nodeId: node.id,
            title: `"${node.label}" has no fallback path`,
            reason: 'Every Simple Branch needs an "otherwise" path so unmatched replies still continue.',
            suggestedFix: 'Connect the fallback branch to a next step.',
            blocking: true,
          }),
        );
      }
      for (const branch of config.branches) {
        if (!branch.next) {
          issues.push(
            issue({
              severity: 'error',
              kind: 'no-next',
              nodeId: node.id,
              title: `"${node.label}" — branch "${branch.label}" has no next step`,
              reason: 'Every branch path needs somewhere to go next.',
              suggestedFix: `Connect the "${branch.label}" branch to a next step.`,
              blocking: true,
            }),
          );
        }
      }
    } else if (!terminalNodeTypes.includes(node.type) && !('next' in node && node.next)) {
      issues.push(
        issue({
          severity: 'error',
          kind: 'no-next',
          nodeId: node.id,
          title: `"${node.label}" has no next step`,
          reason: 'This node needs a next step, or should end the flow with an End block.',
          suggestedFix: 'Connect it to a next node.',
          blocking: true,
        }),
      );
    }

    const contentProblem = contentIssue(node);
    if (contentProblem) issues.push(contentProblem);
  }

  // Obvious loops.
  const looped = findLoopNodeIds(flow, reachable);
  for (const nodeId of looped) {
    const node = findNode(flow, nodeId);
    issues.push(
      issue({
        severity: 'error',
        kind: 'loop',
        nodeId,
        title: `"${node?.label ?? nodeId}" is part of an endless loop`,
        reason: 'This node eventually points back to itself with no way out, which would run forever.',
        suggestedFix: 'Break the cycle by routing to an End block or a different step.',
        blocking: true,
      }),
    );
  }

  // Duplicate live trigger.
  if (flow.trigger.type === 'keyword' && flow.trigger.keyword) {
    const conflict = options.allFlows.find(
      (other) =>
        other.id !== flow.id &&
        other.status === 'live' &&
        other.trigger.type === 'keyword' &&
        other.trigger.keyword?.toLowerCase() === flow.trigger.keyword?.toLowerCase(),
    );
    if (conflict) {
      issues.push(
        issue({
          severity: 'error',
          kind: 'duplicate-trigger',
          nodeId: null,
          title: `Keyword "${flow.trigger.keyword}" is already live on another flow`,
          reason: `"${conflict.name}" is Live and already responds to this keyword. Two live flows cannot share the same trigger.`,
          suggestedFix: 'Change the keyword, or pause/inspect the conflicting flow.',
          blocking: true,
          conflictFlowId: conflict.id,
        }),
      );
    }
  }

  // Session-window risk.
  issues.push(...sessionRiskIssues(flow, reachable));

  // Not tested / changed since test.
  if (!flow.testedAt) {
    issues.push(
      issue({
        severity: 'warning',
        kind: 'not-tested',
        nodeId: null,
        title: 'This flow has never been tested',
        reason: 'Run Test Mode at least once so you can see the path a real customer would take.',
        suggestedFix: 'Open Test Mode and run a complete test.',
        blocking: false,
      }),
    );
  } else if (flow.changedSinceTest) {
    issues.push(
      issue({
        severity: 'warning',
        kind: 'not-tested',
        nodeId: null,
        title: 'Changed since last test',
        reason: 'The flow was edited after the last successful test run, so the tested path may be out of date.',
        suggestedFix: 'Re-run Test Mode to confirm the current version still behaves as expected.',
        blocking: false,
      }),
    );
  }

  return issues;
}

export function errorsOf(issues: ValidationIssue[]): ValidationIssue[] {
  return issues.filter((i) => i.severity === 'error');
}

export function warningsOf(issues: ValidationIssue[]): ValidationIssue[] {
  return issues.filter((i) => i.severity === 'warning');
}

export function blockingIssues(issues: ValidationIssue[]): ValidationIssue[] {
  return issues.filter((i) => i.blocking);
}
