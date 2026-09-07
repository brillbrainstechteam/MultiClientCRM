import { useState } from 'react';
import { ArrowLeft, CheckCircle2, PlayCircle, Send, XCircle } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import {
  Badge,
  Banner,
  Button,
  Drawer,
  ErrorState,
  Input,
  LoadingSkeleton,
  Modal,
  PermissionRestricted,
  Tabs,
  Textarea,
  type TabItem,
} from '@crm/design-system';
import { testCategoryLabel } from '../ai-agents-labels';
import { categoriseMessage, simulateResponse } from '../domain/simulate';
import type { AgentCorrection, AgentTestCase, AgentTestRun, TestFeedback } from '../domain/types';
import { useAgent, useAiAgentsStore, useCorrections, useKnowledgeSources, useSafetyPolicy, useTestCases, useTestRuns } from '../ai-agents-store';
import { can } from '../permissions';

const tabItems: TabItem[] = [
  { id: 'cases', label: 'Standard Tests' },
  { id: 'simulator', label: 'Simulator' },
];

const correctionCopy: Record<Exclude<TestFeedback, 'helpful' | null>, string> = {
  incorrect: 'Explain what was wrong so a reviewer can approve a correction.',
  incomplete: 'Explain what was missing so a reviewer can approve a correction.',
};

/** AIA-S03 Test Lab — standard tests + simulator + feedback/correction loop (SKILL.md "Testing"). */
export default function TestLabScreen() {
  const { agentId } = useParams<{ agentId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role, visibleModules, currentUser } = useWorkspace();
  const { state, dispatch } = useAiAgentsStore();
  const agent = useAgent(agentId);
  const safety = useSafetyPolicy(agentId);
  const sources = useKnowledgeSources(agentId);
  const testCases = useTestCases(agentId);
  const testRuns = useTestRuns(agentId);
  const corrections = useCorrections(agentId);

  const [message, setMessage] = useState('');
  const [activeRun, setActiveRun] = useState<AgentTestRun | null>(null);
  const [correctionSummary, setCorrectionSummary] = useState('');
  const [correctionChange, setCorrectionChange] = useState('');

  const returnTo = searchParams.get('returnTo');
  const view = searchParams.get('view') ?? 'cases';
  const simState = searchParams.get('state');
  const drawerRunId = searchParams.get('drawer') === 'sources' ? searchParams.get('runId') : null;
  const drawerRun = drawerRunId ? testRuns.find((run) => run.id === drawerRunId) ?? null : null;
  const correctionOpen = searchParams.get('modal') === 'correction';
  const correctionFeedback = searchParams.get('feedback') as Exclude<TestFeedback, 'helpful' | null> | null;

  if (!visibleModules.includes('ai-assistance')) {
    return <PermissionRestricted title="You do not have access to AI Agents" description={`Your role (${currentUser.roleLabel}) cannot open this area.`} />;
  }

  if (!agent || !safety) {
    return (
      <ErrorState
        title="Agent not found"
        description="This agent may have been deleted or the link is out of date."
        actions={<Button variant="secondary" onClick={() => navigate(scopedHref('/ai-agents'))}>Back to AI Agents</Button>}
      />
    );
  }

  const canTest = can(role, 'ai_agent.test');
  const canApproveCorrection = can(role, 'ai_agent.approve_correction');

  const requiredCases = testCases.filter((tc) => tc.required);
  const passedCount = requiredCases.filter((tc) => tc.latestResult === 'pass').length;

  const backHref = returnTo ? returnTo : scopedHref(`/ai-agents/${agent.id}`);

  const setView = (id: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('view', id);
      next.delete('state');
      next.delete('case');
      return next;
    });

  const closeDrawer = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('drawer');
      next.delete('runId');
      return next;
    });

  const closeCorrection = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('modal');
      next.delete('feedback');
      return next;
    });

  function recordRun(tc: AgentTestCase | null, text: string, idOffset = 0): AgentTestRun {
    const category = tc?.category ?? categoriseMessage(text, safety!);
    const result = simulateResponse(agent!, category, text, sources, safety!);
    const run: AgentTestRun = {
      id: `run_gen_${state.nextSeq + idOffset}`,
      agentId: agent!.id,
      versionId: agent!.draftVersionId,
      testCaseId: tc?.id ?? null,
      customerMessage: text,
      agentResponse: result.agentResponse,
      sources: result.sources,
      actions: result.actions,
      approvalState: result.approvalState,
      handoverTriggered: result.handoverTriggered,
      result: result.result,
      feedback: null,
      reviewerNote: null,
      correctionId: null,
      runAt: new Date().toISOString(),
    };
    dispatch({ type: 'RECORD_TEST_RUN', run, actorId: currentUser.id });
    return run;
  }

  const runStandardCase = (tc: AgentTestCase) => {
    const run = recordRun(tc, tc.sampleCustomerMessage);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('view', 'cases');
      next.set('drawer', 'sources');
      next.set('runId', run.id);
      return next;
    });
  };

  const runAllRequired = () => {
    requiredCases.forEach((tc, i) => recordRun(tc, tc.sampleCustomerMessage, i));
  };

  const openSimulatorCase = (tc: AgentTestCase) => {
    setMessage(tc.sampleCustomerMessage);
    setActiveRun(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('view', 'simulator');
      next.set('case', tc.category);
      next.delete('state');
      return next;
    });
  };

  const send = () => {
    const text = message.trim();
    if (!text) return;
    const caseParam = searchParams.get('case');
    const tc = caseParam ? testCases.find((t) => t.category === caseParam) ?? null : null;
    const run = recordRun(tc, text);
    setActiveRun(run);
    setMessage('');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('view', 'simulator');
      next.set('state', run.result === 'pass' ? 'passed' : 'failed');
      return next;
    });
  };

  const giveFeedback = (feedback: TestFeedback) => {
    if (!activeRun) return;
    dispatch({ type: 'GIVE_FEEDBACK', runId: activeRun.id, feedback, note: null, actorId: currentUser.id });
    setActiveRun({ ...activeRun, feedback });
    if (feedback === 'incorrect' || feedback === 'incomplete') {
      setCorrectionSummary('');
      setCorrectionChange('');
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('modal', 'correction');
        next.set('feedback', feedback);
        return next;
      });
    }
  };

  const submitCorrection = () => {
    if (!activeRun || !correctionSummary.trim()) return;
    const correction: AgentCorrection = {
      id: `corr_gen_${state.nextSeq}`,
      agentId: agent.id,
      testRunId: activeRun.id,
      summary: correctionSummary.trim(),
      proposedChange: correctionChange.trim() || correctionSummary.trim(),
      status: 'proposed',
      reviewerId: null,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'PROPOSE_CORRECTION', correction });
    closeCorrection();
  };

  return (
    <div className="crm-aia__page">
      <PageHeader
        title={`Test Lab — ${agent.name}`}
        description={`${passedCount} of ${requiredCases.length} required standard tests passing.`}
        breadcrumbs={[{ label: 'AI Agents', to: scopedHref('/ai-agents') }, { label: agent.name, to: scopedHref(`/ai-agents/${agent.id}`) }, { label: 'Test Lab' }]}
        actions={
          <>
            <Button variant="secondary" iconLeft={<ArrowLeft />} onClick={() => navigate(backHref)}>
              {returnTo ? 'Back to setup' : 'Back to agent'}
            </Button>
            {view === 'cases' && canTest ? (
              <Button variant="primary" iconLeft={<PlayCircle />} onClick={runAllRequired}>Run all required tests</Button>
            ) : null}
          </>
        }
        toolbar={<Tabs tabs={tabItems} activeId={view} ariaLabel="Test Lab view" onChange={setView} />}
      />

      {view === 'cases' ? (
        <div className="crm-aia__card">
          <div className="crm-aia__picker-list">
            {testCases.map((tc) => (
              <div key={tc.id} className="crm-aia__source-row">
                <div className="crm-aia__source-main">
                  <span className="crm-aia__source-name">{tc.name}{tc.required ? '' : ' (optional)'}</span>
                  <span className="crm-aia__source-meta">{testCategoryLabel[tc.category]} · "{tc.sampleCustomerMessage}"</span>
                  <span className="crm-aia__source-meta">Expected: {tc.expectedBehavior}</span>
                </div>
                <div className="crm-aia__badge-row">
                  <Badge tone={tc.latestResult === 'pass' ? 'success' : tc.latestResult === 'fail' ? 'danger' : 'neutral'}>
                    {tc.latestResult === 'pass' ? 'Pass' : tc.latestResult === 'fail' ? 'Fail' : 'Not run'}
                  </Badge>
                  {canTest ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => openSimulatorCase(tc)}>Open in simulator</Button>
                      <Button variant="secondary" size="sm" onClick={() => runStandardCase(tc)}>Run</Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="crm-aia__test-grid">
          <div className="crm-aia__card">
            <div className="crm-aia__section" style={{ paddingTop: 0, borderTop: 'none' }}>
              <div className="crm-aia__toolbar">
                <h3 className="crm-aia__section-title">Sample conversation</h3>
                {simState === 'passed' ? <Badge tone="success" icon={<CheckCircle2 />}>Passed</Badge> : simState === 'failed' ? <Badge tone="danger" icon={<XCircle />}>Failed</Badge> : null}
              </div>

              {simState === 'running' && !activeRun ? (
                <LoadingSkeleton lines={3} />
              ) : activeRun ? (
                <div className="crm-aia__conversation">
                  <div className="crm-aia__bubble crm-aia__bubble--customer">{activeRun.customerMessage}</div>
                  <div className="crm-aia__bubble crm-aia__bubble--agent">{activeRun.agentResponse}</div>
                </div>
              ) : (
                <p className="crm-aia__section-hint">Send a message below to see how this agent would respond.</p>
              )}

              {activeRun ? (
                <div className="crm-aia__action-list">
                  {activeRun.sources.map((s) => (
                    <span key={s.sourceId} className="crm-aia__action-chip">Source: {s.sourceName}</span>
                  ))}
                  {activeRun.actions.map((a, i) => (
                    <span key={i} className="crm-aia__action-chip">{a.label} — {a.detail}</span>
                  ))}
                  {activeRun.approvalState !== 'not-required' ? (
                    <span className="crm-aia__action-chip">Sensitive-action approval: {activeRun.approvalState}</span>
                  ) : null}
                  {activeRun.handoverTriggered ? <span className="crm-aia__action-chip">Handed over to a human</span> : null}
                </div>
              ) : null}

              {activeRun && canTest ? (
                <div className="crm-aia__feedback-row">
                  <Button variant={activeRun.feedback === 'helpful' ? 'primary' : 'secondary'} size="sm" onClick={() => giveFeedback('helpful')}>Helpful</Button>
                  <Button variant={activeRun.feedback === 'incorrect' ? 'primary' : 'secondary'} size="sm" onClick={() => giveFeedback('incorrect')}>Incorrect</Button>
                  <Button variant={activeRun.feedback === 'incomplete' ? 'primary' : 'secondary'} size="sm" onClick={() => giveFeedback('incomplete')}>Incomplete</Button>
                </div>
              ) : null}

              {canTest ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <Input
                    label="Customer message"
                    hideLabel
                    placeholder="Type a customer message to test…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                  />
                  <Button variant="primary" iconLeft={<Send />} onClick={send} disabled={!message.trim()}>Send</Button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="crm-aia__rail">
            <div className="crm-aia__card">
              <h3 className="crm-aia__card-title">Recent test runs</h3>
              {testRuns.length === 0 ? (
                <p className="crm-aia__muted">No test runs yet.</p>
              ) : (
                <div className="crm-aia__picker-list">
                  {testRuns.slice(0, 8).map((run) => (
                    <button
                      key={run.id}
                      type="button"
                      className="crm-aia__source-row"
                      style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: 'none' }}
                      onClick={() => setSearchParams((prev) => {
                        const next = new URLSearchParams(prev);
                        next.set('drawer', 'sources');
                        next.set('runId', run.id);
                        return next;
                      })}
                    >
                      <div className="crm-aia__source-main">
                        <span className="crm-aia__source-name">{run.customerMessage}</span>
                        <span className="crm-aia__source-meta">{new Date(run.runAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <Badge tone={run.result === 'pass' ? 'success' : 'danger'} appearance="outline">{run.result === 'pass' ? 'Pass' : 'Fail'}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {corrections.length > 0 ? (
              <div className="crm-aia__card">
                <h3 className="crm-aia__card-title">Corrections</h3>
                <div className="crm-aia__picker-list">
                  {corrections.map((correction) => (
                    <div key={correction.id} className="crm-aia__source-row">
                      <div className="crm-aia__source-main">
                        <span className="crm-aia__source-name">{correction.summary}</span>
                        <span className="crm-aia__source-meta">{correction.proposedChange}</span>
                      </div>
                      <div className="crm-aia__badge-row">
                        <Badge tone={correction.status === 'approved' ? 'success' : correction.status === 'rejected' ? 'danger' : 'info'}>
                          {correction.status === 'approved' ? 'Approved' : correction.status === 'rejected' ? 'Rejected' : 'Proposed'}
                        </Badge>
                        {correction.status === 'proposed' && canApproveCorrection ? (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'REVIEW_CORRECTION', correctionId: correction.id, status: 'approved', actorId: currentUser.id })}>Approve</Button>
                            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'REVIEW_CORRECTION', correctionId: correction.id, status: 'rejected', actorId: currentUser.id })}>Reject</Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <Drawer open={Boolean(drawerRun)} title={drawerRun ? drawerRun.customerMessage : 'Test run'} onClose={closeDrawer}>
        {drawerRun ? (
          <div className="crm-aia__section" style={{ paddingTop: 0, borderTop: 'none' }}>
            <Banner
              tone={drawerRun.result === 'pass' ? 'info' : 'danger'}
              title={drawerRun.result === 'pass' ? 'Passed' : 'Failed'}
              description={drawerRun.agentResponse}
            />
            <h4 className="crm-aia__section-title">Sources referenced</h4>
            {drawerRun.sources.length === 0 ? <p className="crm-aia__muted">No source used.</p> : (
              <div className="crm-aia__action-list">
                {drawerRun.sources.map((s) => <span key={s.sourceId} className="crm-aia__action-chip">{s.sourceName}</span>)}
              </div>
            )}
            <h4 className="crm-aia__section-title">Actions</h4>
            <div className="crm-aia__action-list">
              {drawerRun.actions.map((a, i) => <span key={i} className="crm-aia__action-chip">{a.label} — {a.detail}</span>)}
            </div>
            {drawerRun.handoverTriggered ? <p className="crm-aia__section-hint">This test triggered a human handover.</p> : null}
            {drawerRun.reviewerNote ? <p className="crm-aia__section-hint">Reviewer note: {drawerRun.reviewerNote}</p> : null}
          </div>
        ) : null}
      </Drawer>

      <Modal
        open={correctionOpen}
        title="Propose a correction"
        onClose={closeCorrection}
        footer={
          <>
            <Button variant="secondary" onClick={closeCorrection}>Cancel</Button>
            <Button variant="primary" onClick={submitCorrection} disabled={!correctionSummary.trim()}>Propose correction</Button>
          </>
        }
      >
        <div className="crm-aia__section" style={{ paddingTop: 0, borderTop: 'none' }}>
          <p className="crm-aia__section-hint">{correctionFeedback ? correctionCopy[correctionFeedback] : 'Explain what should change.'}</p>
          <Textarea label="What was wrong" required rows={3} value={correctionSummary} onChange={(e) => setCorrectionSummary(e.target.value)} />
          <Textarea label="Proposed change" hint="This creates a reviewable correction — it does not automatically change the live agent." rows={3} value={correctionChange} onChange={(e) => setCorrectionChange(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
