/**
 * In-memory reactive store for the Automation module (CLAUDE.md §6 — no fake
 * backend, but lifecycle/test/publish state must be genuinely demonstrable).
 * Plain module-level state + a tiny pub/sub, read through
 * `useSyncExternalStore` so every screen re-renders on mutation. Resets on
 * page reload, same as the rest of the prototype's mock data.
 */

import { useSyncExternalStore } from 'react';
import type {
  AutomationFlow,
  FlowAuditEvent,
  FlowNode,
  FlowTestRun,
  FlowTestStep,
  FlowTrigger,
  FlowVersion,
} from '../domain/types';
import { flows as initialFlows } from './mockFlows';
import { versions as initialVersions } from './mockVersions';
import { testRuns as initialTestRuns } from './mockTestRuns';
import { auditEvents as initialAuditEvents } from './mockAudit';
import { findStarterTemplate } from './starterTemplates';

let flows: AutomationFlow[] = structuredClone(initialFlows);
let versions: FlowVersion[] = structuredClone(initialVersions);
let testRuns: FlowTestRun[] = structuredClone(initialTestRuns);
let auditEvents: FlowAuditEvent[] = structuredClone(initialAuditEvents);

let listeners = new Set<() => void>();
function emit() {
  listeners = new Set(listeners);
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let flowSeq = 0;
let versionSeq = 0;
let runSeq = 0;
let auditSeq = 0;
function nextId(prefix: string, seq: () => number): string {
  return `${prefix}_${seq()}`;
}

/* ------------------------------------------------------------------------- */
/* Reads                                                                      */
/* ------------------------------------------------------------------------- */

export function useFlows(): AutomationFlow[] {
  return useSyncExternalStore(subscribe, () => flows);
}

export function useFlow(flowId: string | undefined): AutomationFlow | undefined {
  const all = useFlows();
  return flowId ? all.find((flow) => flow.id === flowId) : undefined;
}

export function useVersions(flowId: string): FlowVersion[] {
  const all = useSyncExternalStore(subscribe, () => versions);
  return all.filter((v) => v.flowId === flowId).sort((a, b) => a.number - b.number);
}

export function useTestRuns(flowId: string): FlowTestRun[] {
  const all = useSyncExternalStore(subscribe, () => testRuns);
  return all.filter((r) => r.flowId === flowId).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

export function useAuditEvents(flowId: string): FlowAuditEvent[] {
  const all = useSyncExternalStore(subscribe, () => auditEvents);
  return all.filter((e) => e.flowId === flowId).sort((a, b) => a.at.localeCompare(b.at));
}

function nowIso(): string {
  return new Date().toISOString();
}

function addAudit(flowId: string, actorId: string, action: FlowAuditEvent['action'], detail: string) {
  auditEvents = [...auditEvents, { id: nextId('aud', () => (auditSeq += 1)), flowId, actorId, action, detail, at: nowIso() }];
}

function patchFlow(flowId: string, patch: Partial<AutomationFlow>) {
  flows = flows.map((flow) => (flow.id === flowId ? { ...flow, ...patch } : flow));
}

/* ------------------------------------------------------------------------- */
/* Creation                                                                   */
/* ------------------------------------------------------------------------- */

export function createFlowFromStarter(templateId: string, actorId: string): AutomationFlow {
  const template = findStarterTemplate(templateId);
  if (!template) throw new Error(`Unknown starter template: ${templateId}`);

  flowSeq += 1;
  const flowId = `flow_new_${flowSeq}`;
  versionSeq += 1;
  const versionId = `ver_new_${versionSeq}`;

  const nodes = structuredClone(template.nodes);
  const trigger = structuredClone(template.trigger);

  const flow: AutomationFlow = {
    id: flowId,
    name: `${template.title} (copy)`,
    purpose: template.businessGoal,
    category: template.category,
    ownerId: actorId,
    status: 'draft',
    testedAt: null,
    changedSinceTest: false,
    currentDraftVersionId: versionId,
    publishedVersionId: null,
    requiresApproval: false,
    trigger,
    startNodeId: template.startNodeId,
    nodes,
    createdBy: actorId,
    updatedBy: actorId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  flows = [flow, ...flows];
  versions = [
    ...versions,
    {
      id: versionId,
      flowId,
      number: 1,
      label: 'Version 1',
      summary: `Created from the ${template.title} starter.`,
      status: 'draft',
      createdBy: actorId,
      createdAt: nowIso(),
      nodes: structuredClone(nodes),
      trigger: structuredClone(trigger),
      startNodeId: template.startNodeId,
    },
  ];
  addAudit(flowId, actorId, 'created', `Created from the ${template.title} starter.`);
  emit();
  return flow;
}

export function cloneFlow(flowId: string, actorId: string): AutomationFlow | undefined {
  const source = flows.find((f) => f.id === flowId);
  if (!source) return undefined;

  flowSeq += 1;
  const newFlowId = `flow_clone_${flowSeq}`;
  versionSeq += 1;
  const versionId = `ver_clone_${versionSeq}`;
  const nodes = structuredClone(source.nodes);
  const trigger = structuredClone(source.trigger);

  const clone: AutomationFlow = {
    ...structuredClone(source),
    id: newFlowId,
    name: `${source.name} (copy)`,
    status: 'draft',
    testedAt: null,
    changedSinceTest: false,
    currentDraftVersionId: versionId,
    publishedVersionId: null,
    requiresApproval: false,
    approvalStage: undefined,
    ownerId: actorId,
    createdBy: actorId,
    updatedBy: actorId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    lastTestRunId: null,
    nodes,
    trigger,
  };

  flows = [clone, ...flows];
  versions = [
    ...versions,
    {
      id: versionId,
      flowId: newFlowId,
      number: 1,
      label: 'Version 1',
      summary: `Cloned from "${source.name}".`,
      status: 'draft',
      createdBy: actorId,
      createdAt: nowIso(),
      nodes: structuredClone(nodes),
      trigger: structuredClone(trigger),
      startNodeId: source.startNodeId,
    },
  ];
  addAudit(newFlowId, actorId, 'cloned', `Cloned from "${source.name}".`);
  emit();
  return clone;
}

/* ------------------------------------------------------------------------- */
/* Builder edits                                                             */
/* ------------------------------------------------------------------------- */

export function updateFlowNodes(flowId: string, nodes: FlowNode[], startNodeId: string, actorId: string, detail = 'Edited the flow canvas.') {
  const flow = flows.find((f) => f.id === flowId);
  if (!flow) return;
  patchFlow(flowId, {
    nodes,
    startNodeId,
    changedSinceTest: flow.testedAt ? true : flow.changedSinceTest,
    updatedBy: actorId,
    updatedAt: nowIso(),
  });
  addAudit(flowId, actorId, 'edited', detail);
  emit();
}

export function updateFlowTrigger(flowId: string, trigger: FlowTrigger, actorId: string) {
  const flow = flows.find((f) => f.id === flowId);
  if (!flow) return;
  patchFlow(flowId, {
    trigger,
    changedSinceTest: flow.testedAt ? true : flow.changedSinceTest,
    updatedBy: actorId,
    updatedAt: nowIso(),
  });
  addAudit(flowId, actorId, 'edited', `Updated the trigger: ${trigger.summary}.`);
  emit();
}

export function updateFlowMeta(flowId: string, patch: { name?: string; purpose?: string }, actorId: string) {
  patchFlow(flowId, { ...patch, updatedBy: actorId, updatedAt: nowIso() });
  addAudit(flowId, actorId, 'edited', 'Updated flow name/purpose.');
  emit();
}

/* ------------------------------------------------------------------------- */
/* Test Mode                                                                  */
/* ------------------------------------------------------------------------- */

export function recordTestRun(
  flowId: string,
  testContactId: string,
  path: FlowTestStep[],
  resultingUpdates: { label: string; value: string }[],
  actorId: string,
  status: 'complete' | 'failed' = 'complete',
  errorMessage?: string,
): FlowTestRun {
  const flow = flows.find((f) => f.id === flowId);
  runSeq += 1;
  const run: FlowTestRun = {
    id: nextId('run_new', () => runSeq),
    flowId,
    versionId: flow?.currentDraftVersionId ?? '',
    testContactId,
    startedAt: nowIso(),
    completedAt: nowIso(),
    status,
    path,
    resultingUpdates,
    errorMessage,
  };
  testRuns = [...testRuns, run];

  if (status === 'complete') {
    patchFlow(flowId, { testedAt: nowIso(), changedSinceTest: false, lastTestRunId: run.id });
    addAudit(flowId, actorId, 'tested', 'Completed a full test run.');
  } else {
    patchFlow(flowId, { lastTestRunId: run.id });
    addAudit(flowId, actorId, 'tested', `Test run failed: ${errorMessage ?? 'validation error'}.`);
  }
  emit();
  return run;
}

/* ------------------------------------------------------------------------- */
/* Publish / lifecycle                                                       */
/* ------------------------------------------------------------------------- */

export interface PublishOptions {
  scheduledStart?: string | null;
  stopDate?: string | null;
}

export function sendForApproval(flowId: string, actorId: string) {
  patchFlow(flowId, { approvalStage: 'pending' });
  addAudit(flowId, actorId, 'sent_for_approval', 'Sent for manager approval before publish.');
  emit();
}

export function approveFlow(flowId: string, actorId: string) {
  patchFlow(flowId, { approvalStage: 'approved' });
  addAudit(flowId, actorId, 'approved', 'Approved for publish.');
  emit();
}

export function requestChanges(flowId: string, actorId: string, reason: string) {
  patchFlow(flowId, { approvalStage: 'changes-requested' });
  addAudit(flowId, actorId, 'changes_requested', reason || 'Requested changes before publish.');
  emit();
}

export function publishFlow(flowId: string, actorId: string, options: PublishOptions = {}): AutomationFlow | undefined {
  const flow = flows.find((f) => f.id === flowId);
  if (!flow) return undefined;

  const previousNumber = versions.filter((v) => v.flowId === flowId).reduce((max, v) => Math.max(max, v.number), 0);
  versionSeq += 1;
  const versionId = nextId('ver_new', () => versionSeq);

  versions = versions.map((v) => (v.flowId === flowId && v.status === 'published' ? { ...v, status: 'superseded' } : v));
  versions = [
    ...versions,
    {
      id: versionId,
      flowId,
      number: previousNumber + 1,
      label: `Version ${previousNumber + 1}`,
      summary: 'Published from the Builder.',
      status: 'published',
      createdBy: actorId,
      createdAt: nowIso(),
      publishedAt: nowIso(),
      nodes: structuredClone(flow.nodes),
      trigger: structuredClone(flow.trigger),
      startNodeId: flow.startNodeId,
    },
  ];

  patchFlow(flowId, {
    status: 'live',
    currentDraftVersionId: versionId,
    publishedVersionId: versionId,
    scheduledStart: options.scheduledStart ?? null,
    stopDate: options.stopDate ?? null,
    approvalStage: flow.requiresApproval ? 'approved' : flow.approvalStage,
  });
  addAudit(flowId, actorId, 'published', options.scheduledStart ? `Scheduled to go Live on ${options.scheduledStart}.` : 'Published — now Live.');
  emit();
  return flows.find((f) => f.id === flowId);
}

export function pauseFlow(flowId: string, actorId: string, reason?: string) {
  patchFlow(flowId, { status: 'paused' });
  addAudit(flowId, actorId, 'paused', reason || 'Paused.');
  emit();
}

export function resumeFlow(flowId: string, actorId: string) {
  patchFlow(flowId, { status: 'live' });
  addAudit(flowId, actorId, 'resumed', 'Resumed — back to Live.');
  emit();
}

export function archiveFlow(flowId: string, actorId: string) {
  patchFlow(flowId, { status: 'inactive' });
  addAudit(flowId, actorId, 'archived', 'Marked Inactive.');
  emit();
}

export function deleteFlow(flowId: string, actorId: string) {
  addAudit(flowId, actorId, 'deleted', 'Deleted.');
  flows = flows.filter((f) => f.id !== flowId);
  emit();
}

export function rollbackFlow(flowId: string, versionId: string, actorId: string) {
  const version = versions.find((v) => v.id === versionId);
  const flow = flows.find((f) => f.id === flowId);
  if (!version || !flow) return;

  versionSeq += 1;
  const newVersionId = nextId('ver_rollback', () => versionSeq);
  const previousNumber = versions.filter((v) => v.flowId === flowId).reduce((max, v) => Math.max(max, v.number), 0);

  versions = [
    ...versions,
    {
      id: newVersionId,
      flowId,
      number: previousNumber + 1,
      label: `Version ${previousNumber + 1}`,
      summary: `Rolled back to ${version.label}.`,
      status: 'draft',
      createdBy: actorId,
      createdAt: nowIso(),
      nodes: structuredClone(version.nodes),
      trigger: structuredClone(version.trigger),
      startNodeId: version.startNodeId,
    },
  ];

  patchFlow(flowId, {
    nodes: structuredClone(version.nodes),
    trigger: structuredClone(version.trigger),
    startNodeId: version.startNodeId,
    currentDraftVersionId: newVersionId,
    changedSinceTest: true,
    updatedBy: actorId,
    updatedAt: nowIso(),
  });
  addAudit(flowId, actorId, 'rolled_back', `Rolled back to ${version.label} as a new editable draft.`);
  emit();
}
