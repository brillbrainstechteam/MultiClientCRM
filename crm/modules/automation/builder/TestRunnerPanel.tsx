import { useState } from 'react';
import { CheckCircle2, PlayCircle, RotateCcw, X, XCircle } from 'lucide-react';
import { Button, Checkbox, IconButton, Select } from '@crm/design-system';
import { contacts, findContact } from '@crm/mock-data';
import type { AutomationFlow, FlowTestStep } from '../domain/types';
import { findNode } from './flow-graph';

interface RunState {
  status: 'idle' | 'awaiting-answer' | 'complete' | 'failed';
  path: FlowTestStep[];
  updates: { label: string; value: string }[];
  currentNodeId: string | null;
  pendingOptions: string[] | null;
  errorMessage?: string;
}

const idleState: RunState = { status: 'idle', path: [], updates: [], currentNodeId: null, pendingOptions: null };
const MAX_STEPS = 60;

/**
 * Deterministic Test Mode (AUTOMATION_GENERATION_SPEC.md §11). No real
 * WhatsApp test traffic — a simulated contact walks the flow, pausing at
 * multiple-choice questions for a simulated answer, and reports the path,
 * message previews and resulting CRM updates.
 */
export function TestRunnerPanel({
  flow,
  canTest,
  onClose,
  onSelectNode,
  onComplete,
}: {
  flow: AutomationFlow;
  canTest: boolean;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
  onComplete: (result: { testContactId: string; path: FlowTestStep[]; updates: { label: string; value: string }[]; status: 'complete' | 'failed'; errorMessage?: string }) => void;
}) {
  const [testContactId, setTestContactId] = useState(contacts[0]?.id ?? '');
  const [simulateReply, setSimulateReply] = useState(true);
  const [run, setRun] = useState<RunState>(idleState);

  const push = (state: RunState, step: FlowTestStep): RunState => ({ ...state, path: [...state.path, step], currentNodeId: step.nodeId });

  function advance(state: RunState, resumeAnswer?: string): RunState {
    let current = state;
    let guard = 0;
    // Only carries from a question to the branch immediately after it.
    let pendingAnswer: string | undefined = resumeAnswer;

    while (guard < MAX_STEPS) {
      guard += 1;
      const nodeId = current.currentNodeId ?? flow.startNodeId;
      const node = findNode(flow.nodes, nodeId);
      if (!node) {
        return { ...current, status: 'failed', errorMessage: 'Reached a disconnected step.' };
      }
      const inheritedAnswer = pendingAnswer;
      pendingAnswer = undefined;

      switch (node.type) {
        case 'send_message':
          current = push(current, { nodeId: node.id, nodeLabel: node.label, kind: 'message', detail: messagePreview(node.config) });
          current = { ...current, currentNodeId: node.next };
          if (!node.next) return { ...current, status: 'complete' };
          break;

        case 'question': {
          if ((node.config.answerType === 'single_select' || node.config.answerType === 'multi_select') && !inheritedAnswer) {
            return { ...current, status: 'awaiting-answer', pendingOptions: node.config.options ?? [], currentNodeId: node.id };
          }
          const answer = inheritedAnswer ?? sampleAnswer(node.config.answerType);
          current = push(current, { nodeId: node.id, nodeLabel: node.label, kind: 'question', detail: `Asked: "${node.config.prompt}"`, simulatedAnswer: answer });
          if (node.config.saveTo) {
            current = { ...current, updates: [...current.updates, { label: node.config.saveTo.label, value: answer }] };
          }
          pendingAnswer = answer;
          current = { ...current, currentNodeId: node.next };
          if (!node.next) return { ...current, status: 'complete' };
          break;
        }

        case 'simple_branch': {
          let matched = node.config.branches.find((b) => inheritedAnswer && b.matchValue && b.matchValue.toLowerCase() === inheritedAnswer.toLowerCase());
          if (node.config.mode === 'reply_no_reply') {
            matched = simulateReply ? node.config.branches[0] : undefined;
          } else if (!matched && node.config.mode === 'field_tag_equality') {
            matched = node.config.branches[0];
          }
          const target = matched ?? node.config.fallback;
          current = push(current, {
            nodeId: node.id,
            nodeLabel: node.label,
            kind: 'branch',
            detail: matched ? `Matched branch "${matched.label}".` : `No branch matched — took fallback "${node.config.fallback.label}".`,
          });
          current = { ...current, currentNodeId: target.next };
          if (!target.next) return { ...current, status: 'complete' };
          break;
        }

        case 'delay_wait': {
          const noResponse = node.config.mode === 'wait_for_reply' && !simulateReply;
          current = push(current, {
            nodeId: node.id,
            nodeLabel: node.label,
            kind: 'wait',
            detail: noResponse ? 'Simulated no response before the deadline — took the no-response path.' : waitSummary(node.config),
          });
          const next = noResponse ? node.config.noResponseNext ?? null : node.next;
          current = { ...current, currentNodeId: next };
          if (!next) return { ...current, status: 'complete' };
          break;
        }

        case 'update_contact': {
          const updates = node.config.updates.map((u) => ({ label: updateLabel(u.kind), value: u.value }));
          current = push(current, { nodeId: node.id, nodeLabel: node.label, kind: 'update', detail: `Applied ${updates.length} update${updates.length === 1 ? '' : 's'}.` });
          current = { ...current, updates: [...current.updates, ...updates], currentNodeId: node.next };
          if (!node.next) return { ...current, status: 'complete' };
          break;
        }

        case 'human_handover':
          current = push(current, { nodeId: node.id, nodeLabel: node.label, kind: 'handover', detail: `Handed off to ${node.config.targetLabel ?? 'a team'} with full context preserved.` });
          return { ...current, status: 'complete' };

        case 'ai_agent_handoff':
          current = push(current, { nodeId: node.id, nodeLabel: node.label, kind: 'ai_handoff', detail: `Handed off to AI Agent "${node.config.agentName ?? 'Unassigned'}".` });
          return { ...current, status: 'complete' };

        case 'end':
          current = push(current, { nodeId: node.id, nodeLabel: node.label, kind: 'end', detail: node.config.outcomeLabel || 'Flow completed.' });
          return { ...current, status: 'complete' };

        case 'api_call':
        case 'webhook':
        case 'external_integration':
          if (!node.config.available) {
            return { ...current, status: 'failed', errorMessage: `"${node.label}" needs a connected integration.` };
          }
          current = push(current, { nodeId: node.id, nodeLabel: node.label, kind: 'integration', detail: 'Simulated integration call.' });
          current = { ...current, currentNodeId: node.next };
          if (!node.next) return { ...current, status: 'complete' };
          break;

        default:
          return { ...current, status: 'failed', errorMessage: `"${node.label}" is a Phase 2 block and cannot be tested.` };
      }
    }
    return { ...current, status: 'failed', errorMessage: 'Stopped after 60 steps — this looks like an endless loop.' };
  }

  const startTest = () => {
    const result = advance({ ...idleState, currentNodeId: flow.startNodeId });
    setRun(result);
    if (result.status === 'complete' || result.status === 'failed') {
      onComplete({ testContactId, path: result.path, updates: result.updates, status: result.status, errorMessage: result.errorMessage });
    }
  };

  const answerWith = (answer: string) => {
    const result = advance(run, answer);
    setRun(result);
    if (result.status === 'complete' || result.status === 'failed') {
      onComplete({ testContactId, path: result.path, updates: result.updates, status: result.status, errorMessage: result.errorMessage });
    }
  };

  const reset = () => setRun(idleState);

  return (
    <div className="crm-aut-nodeconfig">
      <header className="crm-aut-nodeconfig__header">
        <div className="crm-aut-nodeconfig__heading">
          <p className="crm-aut-nodeconfig__type">Test Mode</p>
          <p className="crm-aut-trigger__title">Simulated test run</p>
        </div>
        <IconButton label="Close panel" icon={<X />} size="sm" onClick={onClose} />
      </header>

      <div className="crm-aut-nodeconfig__body">
        {run.status === 'idle' ? (
          <div className="crm-aut-form">
            <Select
              label="Test contact"
              options={contacts.map((c) => ({ value: c.id, label: `${c.name} — ${c.mobile}` }))}
              value={testContactId}
              onChange={(e) => setTestContactId(e.target.value)}
            />
            <Checkbox
              label="Simulate a customer reply (vs. no response)"
              checked={simulateReply}
              onChange={(e) => setSimulateReply(e.target.checked)}
            />
            <Button variant="primary" iconLeft={<PlayCircle />} onClick={startTest} disabled={!canTest} fullWidth>
              Start Test
            </Button>
          </div>
        ) : (
          <div className="crm-aut-form">
            <p className="crm-aut-form__note">Testing as {findContact(testContactId)?.name ?? 'test contact'}</p>

            <ol className="crm-aut-test__trace">
              {run.path.map((step, index) => (
                <li key={`${step.nodeId}-${index}`} className="crm-aut-test__step">
                  <button className="crm-aut-test__step-node" onClick={() => onSelectNode(step.nodeId)}>
                    {step.nodeLabel}
                  </button>
                  <p className="crm-aut-test__step-detail">{step.detail}</p>
                  {step.simulatedAnswer ? <p className="crm-aut-test__step-answer">Simulated answer: "{step.simulatedAnswer}"</p> : null}
                </li>
              ))}
            </ol>

            {run.status === 'awaiting-answer' && run.pendingOptions ? (
              <div className="crm-aut-form__list">
                <p className="crm-aut-form__list-label">Choose a simulated answer</p>
                {run.pendingOptions.map((option) => (
                  <Button key={option} variant="secondary" size="sm" onClick={() => answerWith(option)}>
                    {option}
                  </Button>
                ))}
              </div>
            ) : null}

            {run.status === 'complete' ? (
              <div className="crm-aut-test__result crm-aut-test__result--complete">
                <CheckCircle2 size={18} />
                <span>Test complete — this flow is now marked Tested.</span>
              </div>
            ) : null}

            {run.status === 'failed' ? (
              <div className="crm-aut-test__result crm-aut-test__result--failed">
                <XCircle size={18} />
                <span>{run.errorMessage ?? 'Test run failed.'}</span>
              </div>
            ) : null}

            {run.updates.length > 0 ? (
              <div className="crm-aut-form__list">
                <p className="crm-aut-form__list-label">Resulting CRM updates</p>
                {run.updates.map((u, i) => (
                  <p key={i} className="crm-aut-test__update">
                    {u.label}: <strong>{u.value}</strong>
                  </p>
                ))}
              </div>
            ) : null}

            {run.status === 'complete' || run.status === 'failed' ? (
              <Button variant="ghost" size="sm" iconLeft={<RotateCcw />} onClick={reset}>
                Run again
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function messagePreview(config: { mode: string; text?: string; templateName?: string; mediaLabel?: string }): string {
  if (config.mode === 'template') return `Sent approved template "${config.templateName ?? 'Untitled'}".`;
  if (config.mode === 'media') return `Sent media: ${config.mediaLabel ?? 'untitled'}.`;
  return `Sent: "${config.text ?? ''}"`;
}

function waitSummary(config: { mode: string; durationValue?: number; durationUnit?: string; untilDateTime?: string }): string {
  if (config.mode === 'duration') return `Simulated a wait of ${config.durationValue ?? 0} ${config.durationUnit ?? ''}.`;
  if (config.mode === 'until_datetime') return `Simulated a wait until ${config.untilDateTime ?? 'the configured time'}.`;
  return 'Simulated waiting for a reply — customer replied.';
}

function sampleAnswer(answerType: string): string {
  switch (answerType) {
    case 'name': return 'Test Contact';
    case 'phone': return '+919810000000';
    case 'email': return 'test@example.com';
    case 'date': return '2026-08-20';
    case 'location': return 'New Delhi';
    case 'business_requirement': return '50 units, delivered by month end';
    default: return 'Sample answer';
  }
}

function updateLabel(kind: string): string {
  switch (kind) {
    case 'tagAdd': return 'Tag added';
    case 'tagRemove': return 'Tag removed';
    case 'stage': return 'Stage';
    case 'owner': return 'Owner';
    case 'priority': return 'Priority';
    case 'followUpDate': return 'Follow-up date';
    default: return 'Field updated';
  }
}
