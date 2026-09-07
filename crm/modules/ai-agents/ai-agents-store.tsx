import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import {
  agentAuditEvents,
  agentCorrections,
  agentTestCases,
  agentTestRuns,
  agentUsageSummaries,
  agentVersions,
  aiAgents,
  knowledgeSources,
  safetyPolicies,
} from './domain/fixtures';
import type {
  AgentAuditEvent,
  AgentCorrection,
  AgentSafetyPolicy,
  AgentTestCase,
  AgentTestRun,
  AgentUsageSummary,
  AgentVersion,
  AiAgent,
  AuditActionKind,
  CorrectionStatus,
  KnowledgeSource,
  TestFeedback,
} from './domain/types';

/**
 * Session-scoped prototype "backend" for AI Agents. The module has four
 * surfaces (Library, Setup, Test Lab, Usage) that all need to see the same
 * lifecycle/version/audit state after an action — e.g. activating an agent in
 * Setup must show as Active back in the Library. State is seeded from the
 * deterministic fixtures and mutated only through the actions below; nothing
 * is persisted beyond the browser session (CLAUDE.md §6 — no fake backend).
 */

interface AiAgentsState {
  agents: AiAgent[];
  knowledgeSources: KnowledgeSource[];
  safetyPolicies: Record<string, AgentSafetyPolicy>;
  testCases: AgentTestCase[];
  testRuns: AgentTestRun[];
  corrections: AgentCorrection[];
  versions: AgentVersion[];
  auditEvents: AgentAuditEvent[];
  usageSummaries: AgentUsageSummary[];
  deletedAgentIds: string[];
  nextSeq: number;
}

function initState(): AiAgentsState {
  return {
    agents: aiAgents.map((agent) => ({ ...agent, responsibilities: [...agent.responsibilities], supportedLanguages: [...agent.supportedLanguages] })),
    knowledgeSources: knowledgeSources.map((source) => ({ ...source, allowedAgentIds: [...source.allowedAgentIds] })),
    safetyPolicies: Object.fromEntries(
      Object.entries(safetyPolicies).map(([agentId, policy]) => [
        agentId,
        {
          ...policy,
          sensitiveActions: policy.sensitiveActions.map((a) => ({ ...a })),
          restrictedTopics: [...policy.restrictedTopics],
          dataAccess: policy.dataAccess.map((d) => ({ ...d })),
          masking: policy.masking.map((m) => ({ ...m })),
          handover: { ...policy.handover },
        },
      ]),
    ),
    testCases: agentTestCases.map((tc) => ({ ...tc })),
    testRuns: agentTestRuns.map((run) => ({ ...run, sources: [...run.sources], actions: [...run.actions] })),
    corrections: agentCorrections.map((c) => ({ ...c })),
    versions: agentVersions.map((v) => ({ ...v })),
    auditEvents: agentAuditEvents.map((e) => ({ ...e })),
    usageSummaries: agentUsageSummaries.map((u) => ({ ...u, trend: [...u.trend] })),
    deletedAgentIds: [],
    nextSeq: 1,
  };
}

type Action =
  | { type: 'CREATE_AGENT'; agent: AiAgent; version: AgentVersion; safety: AgentSafetyPolicy; actorId: string }
  | { type: 'UPDATE_PURPOSE'; agentId: string; fields: Partial<Pick<AiAgent, 'name' | 'useCase' | 'objective' | 'responsibilities' | 'instructions' | 'tone' | 'supportedLanguages'>>; actorId: string }
  | { type: 'UPDATE_SAFETY'; agentId: string; policy: AgentSafetyPolicy; actorId: string }
  | { type: 'ADD_KNOWLEDGE_SOURCE'; source: KnowledgeSource; actorId: string }
  | { type: 'REPLACE_KNOWLEDGE_SOURCE'; sourceId: string; updates: Partial<KnowledgeSource>; actorId: string }
  | { type: 'REMOVE_KNOWLEDGE_SOURCE'; sourceId: string; agentId: string; actorId: string }
  | { type: 'RECORD_TEST_RUN'; run: AgentTestRun; actorId: string }
  | { type: 'GIVE_FEEDBACK'; runId: string; feedback: TestFeedback; note: string | null; actorId: string }
  | { type: 'PROPOSE_CORRECTION'; correction: AgentCorrection }
  | { type: 'REVIEW_CORRECTION'; correctionId: string; status: CorrectionStatus; actorId: string }
  | { type: 'ACTIVATE'; agentId: string; actorId: string }
  | { type: 'PAUSE'; agentId: string; actorId: string }
  | { type: 'RESUME'; agentId: string; actorId: string }
  | { type: 'DEACTIVATE'; agentId: string; actorId: string }
  | { type: 'DELETE'; agentId: string; actorId: string }
  | { type: 'CLONE'; sourceAgentId: string; newAgent: AiAgent; newVersion: AgentVersion; actorId: string }
  | { type: 'ROLLBACK'; agentId: string; toVersionId: string; actorId: string }
  | { type: 'SET_ALERT_THRESHOLD'; agentId: string; threshold: number };

function pushAudit(events: AgentAuditEvent[], seq: number, agentId: string, actorId: string | null, action: AuditActionKind, detail: string, extra?: Partial<AgentAuditEvent>): AgentAuditEvent[] {
  return [{ id: `aud_gen_${seq}`, agentId, actorId, action, detail, at: new Date().toISOString(), ...extra }, ...events];
}

function reducer(state: AiAgentsState, action: Action): AiAgentsState {
  const seq = state.nextSeq;
  switch (action.type) {
    case 'CREATE_AGENT':
      return {
        ...state,
        agents: [...state.agents, action.agent],
        versions: [...state.versions, action.version],
        safetyPolicies: { ...state.safetyPolicies, [action.agent.id]: action.safety },
        auditEvents: pushAudit(state.auditEvents, seq, action.agent.id, action.actorId, 'created', `Created ${action.agent.name}.`),
        nextSeq: seq + 1,
      };

    case 'UPDATE_PURPOSE': {
      const agents = state.agents.map((agent) =>
        agent.id === action.agentId
          ? { ...agent, ...action.fields, updatedAt: new Date().toISOString(), changedSinceTest: agent.testedAt ? true : agent.changedSinceTest }
          : agent,
      );
      return {
        ...state,
        agents,
        auditEvents: pushAudit(state.auditEvents, seq, action.agentId, action.actorId, 'edited', 'Updated agent purpose (role, instructions, tone or languages).'),
        nextSeq: seq + 1,
      };
    }

    case 'UPDATE_SAFETY': {
      const agent = state.agents.find((a) => a.id === action.agentId);
      const agents = state.agents.map((a) =>
        a.id === action.agentId
          ? { ...a, updatedAt: new Date().toISOString(), changedSinceTest: agent?.testedAt ? true : a.changedSinceTest, hasBlockingSafetyIssues: !action.policy.handover.defaultTeamId }
          : a,
      );
      return {
        ...state,
        agents,
        safetyPolicies: { ...state.safetyPolicies, [action.agentId]: action.policy },
        auditEvents: pushAudit(state.auditEvents, seq, action.agentId, action.actorId, 'edited', 'Updated safety and handover configuration.'),
        nextSeq: seq + 1,
      };
    }

    case 'ADD_KNOWLEDGE_SOURCE': {
      const agent = state.agents.find((a) => a.id === action.source.agentId);
      const agents = state.agents.map((a) =>
        a.id === action.source.agentId
          ? { ...a, changedSinceTest: agent?.testedAt ? true : a.changedSinceTest, updatedAt: new Date().toISOString() }
          : a,
      );
      return {
        ...state,
        agents,
        knowledgeSources: [...state.knowledgeSources, action.source],
        auditEvents: pushAudit(state.auditEvents, seq, action.source.agentId, action.actorId, 'knowledge-changed', `Added knowledge source "${action.source.name}".`),
        nextSeq: seq + 1,
      };
    }

    case 'REPLACE_KNOWLEDGE_SOURCE': {
      const source = state.knowledgeSources.find((s) => s.id === action.sourceId);
      if (!source) return state;
      const agent = state.agents.find((a) => a.id === source.agentId);
      const agents = state.agents.map((a) =>
        a.id === source.agentId ? { ...a, changedSinceTest: agent?.testedAt ? true : a.changedSinceTest, updatedAt: new Date().toISOString() } : a,
      );
      return {
        ...state,
        agents,
        knowledgeSources: state.knowledgeSources.map((s) => (s.id === action.sourceId ? { ...s, ...action.updates } : s)),
        auditEvents: pushAudit(state.auditEvents, seq, source.agentId, action.actorId, 'knowledge-changed', `Replaced knowledge source "${source.name}".`),
        nextSeq: seq + 1,
      };
    }

    case 'REMOVE_KNOWLEDGE_SOURCE': {
      const source = state.knowledgeSources.find((s) => s.id === action.sourceId);
      const agent = state.agents.find((a) => a.id === action.agentId);
      const agents = state.agents.map((a) =>
        a.id === action.agentId ? { ...a, changedSinceTest: agent?.testedAt ? true : a.changedSinceTest, updatedAt: new Date().toISOString() } : a,
      );
      return {
        ...state,
        agents,
        knowledgeSources: state.knowledgeSources.filter((s) => s.id !== action.sourceId),
        auditEvents: pushAudit(state.auditEvents, seq, action.agentId, action.actorId, 'knowledge-changed', `Removed knowledge source "${source?.name ?? action.sourceId}".`),
        nextSeq: seq + 1,
      };
    }

    case 'RECORD_TEST_RUN': {
      const testCases = state.testCases.map((tc) =>
        tc.id === action.run.testCaseId ? { ...tc, latestResult: action.run.result } : tc,
      );
      const agentTests = testCases.filter((tc) => tc.agentId === action.run.agentId);
      const allRequiredPass = agentTests.filter((tc) => tc.required).every((tc) => tc.latestResult === 'pass') && agentTests.some((tc) => tc.required);
      const now = new Date().toISOString();
      const agents = state.agents.map((agent) =>
        agent.id === action.run.agentId
          ? {
              ...agent,
              testedAt: now,
              changedSinceTest: false,
              lifecycleStatus: allRequiredPass && agent.lifecycleStatus === 'ready_to_test' ? 'tested' : agent.lifecycleStatus,
            }
          : agent,
      );
      const versions = state.versions.map((v) =>
        v.id === agents.find((a) => a.id === action.run.agentId)?.draftVersionId ? { ...v, testedAt: now } : v,
      );
      return {
        ...state,
        agents,
        versions,
        testCases,
        testRuns: [action.run, ...state.testRuns],
        auditEvents: pushAudit(state.auditEvents, seq, action.run.agentId, action.actorId, 'tested', `Ran "${action.run.customerMessage}" — ${action.run.result === 'pass' ? 'Passed' : 'Failed'}.`, {
          sourceRefs: action.run.sources.map((s) => s.sourceId),
        }),
        nextSeq: seq + 1,
      };
    }

    case 'GIVE_FEEDBACK': {
      const run = state.testRuns.find((r) => r.id === action.runId);
      return {
        ...state,
        testRuns: state.testRuns.map((r) => (r.id === action.runId ? { ...r, feedback: action.feedback, reviewerNote: action.note } : r)),
        auditEvents: run ? pushAudit(state.auditEvents, seq, run.agentId, action.actorId, 'test-feedback', `Marked a test response as ${action.feedback ?? 'cleared'}.`) : state.auditEvents,
        nextSeq: seq + 1,
      };
    }

    case 'PROPOSE_CORRECTION': {
      const run = state.testRuns.find((r) => r.id === action.correction.testRunId);
      return {
        ...state,
        corrections: [action.correction, ...state.corrections],
        testRuns: state.testRuns.map((r) => (r.id === action.correction.testRunId ? { ...r, correctionId: action.correction.id } : r)),
        auditEvents: run ? pushAudit(state.auditEvents, seq, run.agentId, null, 'correction-proposed', action.correction.summary) : state.auditEvents,
        nextSeq: seq + 1,
      };
    }

    case 'REVIEW_CORRECTION': {
      const correction = state.corrections.find((c) => c.id === action.correctionId);
      return {
        ...state,
        corrections: state.corrections.map((c) =>
          c.id === action.correctionId ? { ...c, status: action.status, reviewerId: action.actorId } : c,
        ),
        auditEvents: correction
          ? pushAudit(
              state.auditEvents,
              seq,
              correction.agentId,
              action.actorId,
              action.status === 'approved' ? 'correction-approved' : 'correction-rejected',
              `${action.status === 'approved' ? 'Approved' : 'Rejected'} correction: ${correction.summary}`,
            )
          : state.auditEvents,
        nextSeq: seq + 1,
      };
    }

    case 'ACTIVATE': {
      const agent = state.agents.find((a) => a.id === action.agentId);
      if (!agent) return state;
      const now = new Date().toISOString();
      const versions = state.versions.map((v) => {
        if (v.agentId !== action.agentId) return v;
        if (v.id === agent.draftVersionId) return { ...v, label: 'active' as const, activatedAt: now };
        if (v.label === 'active') return { ...v, label: 'archived' as const };
        return v;
      });
      return {
        ...state,
        agents: state.agents.map((a) => (a.id === action.agentId ? { ...a, lifecycleStatus: 'active', activeVersionId: agent.draftVersionId } : a)),
        versions,
        auditEvents: pushAudit(state.auditEvents, seq, action.agentId, action.actorId, 'activated', `Activated version ${versions.find((v) => v.id === agent.draftVersionId)?.number ?? ''}.`),
        nextSeq: seq + 1,
      };
    }

    case 'PAUSE':
      return {
        ...state,
        agents: state.agents.map((a) => (a.id === action.agentId ? { ...a, lifecycleStatus: 'paused' } : a)),
        auditEvents: pushAudit(state.auditEvents, seq, action.agentId, action.actorId, 'paused', 'Paused — the agent will stop handling new conversations.'),
        nextSeq: seq + 1,
      };

    case 'RESUME':
      return {
        ...state,
        agents: state.agents.map((a) => (a.id === action.agentId ? { ...a, lifecycleStatus: 'active' } : a)),
        auditEvents: pushAudit(state.auditEvents, seq, action.agentId, action.actorId, 'resumed', 'Resumed handling new conversations.'),
        nextSeq: seq + 1,
      };

    case 'DEACTIVATE':
      return {
        ...state,
        agents: state.agents.map((a) => (a.id === action.agentId ? { ...a, lifecycleStatus: 'inactive', activeVersionId: null } : a)),
        auditEvents: pushAudit(state.auditEvents, seq, action.agentId, action.actorId, 'deactivated', 'Deactivated. Setup and history are kept.'),
        nextSeq: seq + 1,
      };

    case 'DELETE':
      return {
        ...state,
        deletedAgentIds: [...state.deletedAgentIds, action.agentId],
        nextSeq: seq + 1,
      };

    case 'CLONE':
      return {
        ...state,
        agents: [...state.agents, action.newAgent],
        versions: [...state.versions, action.newVersion],
        safetyPolicies: { ...state.safetyPolicies, [action.newAgent.id]: { ...state.safetyPolicies[action.sourceAgentId] } },
        knowledgeSources: [
          ...state.knowledgeSources,
          ...state.knowledgeSources
            .filter((s) => s.agentId === action.sourceAgentId)
            .map((s) => ({ ...s, id: `${s.id}_clone_${seq}`, agentId: action.newAgent.id, allowedAgentIds: [action.newAgent.id] })),
        ],
        auditEvents: pushAudit(state.auditEvents, seq, action.newAgent.id, action.actorId, 'created', `Cloned from ${state.agents.find((a) => a.id === action.sourceAgentId)?.name ?? 'another agent'}.`),
        nextSeq: seq + 1,
      };

    case 'ROLLBACK': {
      const target = state.versions.find((v) => v.id === action.toVersionId);
      if (!target) return state;
      const now = new Date().toISOString();
      const newVersionId = `ver_gen_${seq}`;
      const newDraft: AgentVersion = {
        id: newVersionId,
        agentId: action.agentId,
        number: Math.max(...state.versions.filter((v) => v.agentId === action.agentId).map((v) => v.number)) + 1,
        label: 'draft',
        snapshotSummary: `Restored from version ${target.number} (${target.snapshotSummary})`,
        createdBy: action.actorId,
        createdAt: now,
        testedAt: null,
        activatedAt: null,
        note: `Rollback of version ${target.number}. Re-test required before activation.`,
      };
      return {
        ...state,
        versions: [...state.versions, newDraft],
        agents: state.agents.map((a) =>
          a.id === action.agentId ? { ...a, draftVersionId: newVersionId, changedSinceTest: true, lifecycleStatus: a.lifecycleStatus === 'active' ? 'active' : 'ready_to_test' } : a,
        ),
        auditEvents: pushAudit(state.auditEvents, seq, action.agentId, action.actorId, 'rollback', `Rolled back to version ${target.number} as a new draft. Re-test required.`),
        nextSeq: seq + 1,
      };
    }

    case 'SET_ALERT_THRESHOLD':
      return {
        ...state,
        usageSummaries: state.usageSummaries.map((u) => (u.agentId === action.agentId ? { ...u, alertThreshold: action.threshold } : u)),
        nextSeq: seq + 1,
      };

    default:
      return state;
  }
}

interface AiAgentsStoreValue {
  state: AiAgentsState;
  dispatch: Dispatch<Action>;
}

const AiAgentsStoreContext = createContext<AiAgentsStoreValue | null>(null);

export function AiAgentsStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AiAgentsStoreContext.Provider value={value}>{children}</AiAgentsStoreContext.Provider>;
}

export function useAiAgentsStore(): AiAgentsStoreValue {
  const context = useContext(AiAgentsStoreContext);
  if (!context) throw new Error('useAiAgentsStore must be used inside <AiAgentsStoreProvider>.');
  return context;
}

/* Convenience selectors over the live store state (mirror domain/fixtures find* helpers). */

export function useAgents(): AiAgent[] {
  const { state } = useAiAgentsStore();
  return state.agents.filter((a) => !state.deletedAgentIds.includes(a.id));
}

export function useAgent(agentId: string | undefined): AiAgent | undefined {
  const { state } = useAiAgentsStore();
  return agentId ? state.agents.find((a) => a.id === agentId && !state.deletedAgentIds.includes(agentId)) : undefined;
}

export function useKnowledgeSources(agentId: string | undefined): KnowledgeSource[] {
  const { state } = useAiAgentsStore();
  return agentId ? state.knowledgeSources.filter((s) => s.agentId === agentId) : [];
}

export function useSafetyPolicy(agentId: string | undefined): AgentSafetyPolicy | undefined {
  const { state } = useAiAgentsStore();
  return agentId ? state.safetyPolicies[agentId] : undefined;
}

export function useTestCases(agentId: string | undefined): AgentTestCase[] {
  const { state } = useAiAgentsStore();
  return agentId ? state.testCases.filter((tc) => tc.agentId === agentId) : [];
}

export function useTestRuns(agentId: string | undefined): AgentTestRun[] {
  const { state } = useAiAgentsStore();
  return agentId ? state.testRuns.filter((r) => r.agentId === agentId).sort((a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime()) : [];
}

export function useCorrections(agentId: string | undefined): AgentCorrection[] {
  const { state } = useAiAgentsStore();
  return agentId ? state.corrections.filter((c) => c.agentId === agentId) : [];
}

export function useVersions(agentId: string | undefined): AgentVersion[] {
  const { state } = useAiAgentsStore();
  return agentId ? state.versions.filter((v) => v.agentId === agentId).sort((a, b) => b.number - a.number) : [];
}

export function useAuditEvents(agentId: string | undefined): AgentAuditEvent[] {
  const { state } = useAiAgentsStore();
  return agentId ? state.auditEvents.filter((e) => e.agentId === agentId).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()) : [];
}

export function useUsageSummary(agentId: string | undefined): AgentUsageSummary | undefined {
  const { state } = useAiAgentsStore();
  return agentId ? state.usageSummaries.find((u) => u.agentId === agentId) : undefined;
}

export function useAllUsageSummaries(): AgentUsageSummary[] {
  const { state } = useAiAgentsStore();
  return state.usageSummaries;
}
