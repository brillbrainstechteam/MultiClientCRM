import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '@crm/app/workspace-context';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Banner, Button, WizardShell, type StepperItem } from '@crm/design-system';
import { KnowledgeManager } from '../components/KnowledgeManager';
import { SafetyHandoverForm } from '../components/SafetyHandoverForm';
import { ReadinessChecklist } from '../components/ReadinessChecklist';
import { PurposeFieldsForm, toLanguages, toResponsibilities, type PurposeValue } from '../components/PurposeFieldsForm';
import { useAgent, useAiAgentsStore } from '../ai-agents-store';
import { useAgentReadiness } from '../use-agent-readiness';
import type { AgentVersion, AiAgent } from '../domain/types';

const steps: StepperItem[] = [
  { id: 'purpose', label: 'Purpose' },
  { id: 'knowledge', label: 'Knowledge' },
  { id: 'safety', label: 'Safety & Handover' },
  { id: 'test', label: 'Test' },
  { id: 'activate', label: 'Activate' },
];

const blankPurpose: PurposeValue = {
  name: '',
  useCase: 'custom',
  objective: '',
  responsibilities: '',
  instructions: '',
  tone: '',
  supportedLanguages: '',
};

/** AIA-S02 guided creation wizard (`/ai-agents/new?step=…`) — a stepper for first creation, tabs for later editing. */
export default function AgentCreateScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { currentUser, branchId, whatsappNumberId } = useWorkspace();
  const { dispatch, state } = useAiAgentsStore();

  const step = searchParams.get('step') ?? 'purpose';
  const draftAgentId = searchParams.get('agentId');
  const draftAgent = useAgent(draftAgentId ?? undefined);
  const readiness = useAgentReadiness(draftAgentId ?? undefined);

  const [purpose, setPurpose] = useState<PurposeValue>(() =>
    draftAgent
      ? {
          name: draftAgent.name,
          useCase: draftAgent.useCase,
          objective: draftAgent.objective,
          responsibilities: draftAgent.responsibilities.join('\n'),
          instructions: draftAgent.instructions,
          tone: draftAgent.tone,
          supportedLanguages: draftAgent.supportedLanguages.join(', '),
        }
      : blankPurpose,
  );

  const goToStep = (nextStep: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('step', nextStep);
      if (draftAgentId) next.set('agentId', draftAgentId);
      return next;
    });

  const purposeValid =
    purpose.name.trim() && purpose.objective.trim() && purpose.instructions.trim() && purpose.tone.trim() && toResponsibilities(purpose.responsibilities).length > 0 && toLanguages(purpose.supportedLanguages).length > 0;

  const savePurposeAndContinue = () => {
    const fields = {
      name: purpose.name.trim(),
      useCase: purpose.useCase,
      objective: purpose.objective.trim(),
      responsibilities: toResponsibilities(purpose.responsibilities),
      instructions: purpose.instructions.trim(),
      tone: purpose.tone.trim(),
      supportedLanguages: toLanguages(purpose.supportedLanguages),
    };

    if (draftAgent) {
      dispatch({ type: 'UPDATE_PURPOSE', agentId: draftAgent.id, fields, actorId: currentUser.id });
      goToStep('knowledge');
      return;
    }

    const newId = `agent_new_${state.nextSeq}`;
    const versionId = `ver_new_${state.nextSeq}`;
    const now = new Date().toISOString();
    const newAgent: AiAgent = {
      id: newId,
      tenantId: 'workspace_northline',
      ...fields,
      lifecycleStatus: 'draft',
      testedAt: null,
      changedSinceTest: false,
      hasBlockingSafetyIssues: true,
      activeVersionId: null,
      draftVersionId: versionId,
      ownerId: currentUser.id,
      branchId: branchId === 'all' ? undefined : branchId,
      whatsappNumberId: whatsappNumberId === 'all' ? undefined : whatsappNumberId,
      createdAt: now,
      updatedAt: now,
    };
    const newVersion: AgentVersion = {
      id: versionId,
      agentId: newId,
      number: 1,
      label: 'draft',
      snapshotSummary: `Initial draft — ${fields.name}.`,
      createdBy: currentUser.id,
      createdAt: now,
      testedAt: null,
      activatedAt: null,
      note: null,
    };
    dispatch({
      type: 'CREATE_AGENT',
      agent: newAgent,
      version: newVersion,
      safety: {
        autonomyPreset: 'conservative',
        sensitiveActions: [
          { key: 'quotation', label: 'Quotation', requiresApproval: true },
          { key: 'discount', label: 'Discount', requiresApproval: true },
          { key: 'payment-commitment', label: 'Payment commitment', requiresApproval: true },
          { key: 'refund', label: 'Refund', requiresApproval: true },
          { key: 'custom-commitment', label: 'Other sensitive commitment', requiresApproval: true },
        ],
        restrictedTopics: [],
        dataAccess: [
          { scope: 'contact-profile', allowed: true },
          { scope: 'conversation-history', allowed: true },
          { scope: 'orders-payments', allowed: false },
          { scope: 'catalogue-products', allowed: false },
          { scope: 'calling-context', allowed: false },
        ],
        masking: [
          { category: 'payment-details', masked: true },
          { category: 'government-id', masked: true },
          { category: 'personal-address', masked: true },
          { category: 'internal-notes', masked: true },
        ],
        failurePolicy: {
          onMissingData: 'handover',
          onIntegrationUnavailable: 'handover',
          onLowConfidence: 'handover',
          onRestrictedTopic: 'refuse-and-handover',
          onSensitiveAction: 'request-approval',
        },
        handover: { defaultTeamId: null, outsideHoursFallback: 'queue', noEligibleAgentFallback: 'queue' },
        dataAccessReviewed: false,
      },
      actorId: currentUser.id,
    });
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('step', 'knowledge');
      next.set('agentId', newId);
      return next;
    });
  };

  const cancel = () => navigate(scopedHref('/ai-agents'));

  if (step !== 'purpose' && !draftAgent) {
    return (
      <div className="crm-aia__card">
        <Banner tone="warning" title="Start with Purpose" description="Complete the Purpose step before continuing to Knowledge, Safety, Test or Activate." />
        <Button variant="primary" onClick={() => goToStep('purpose')}>Go to Purpose</Button>
      </div>
    );
  }

  return (
    <WizardShell
      title="Create AI Agent"
      subtitle={draftAgent ? draftAgent.name : 'Define a role, knowledge, permissions and safety boundaries.'}
      steps={steps}
      currentId={step}
      onCancel={cancel}
      footer={
        <>
          <Button variant="secondary" onClick={() => (step === 'purpose' ? cancel() : goToStep(steps[steps.findIndex((s) => s.id === step) - 1].id))}>
            {step === 'purpose' ? 'Cancel' : 'Back'}
          </Button>
          {step === 'purpose' ? (
            <Button variant="primary" onClick={savePurposeAndContinue} disabled={!purposeValid}>Continue</Button>
          ) : step === 'knowledge' ? (
            <Button variant="primary" onClick={() => goToStep('safety')}>Continue</Button>
          ) : step === 'safety' ? (
            <Button variant="primary" onClick={() => goToStep('test')}>Continue</Button>
          ) : step === 'test' ? (
            <Button variant="primary" onClick={() => navigate(scopedHref(`/ai-agents/${draftAgentId}/test`, { returnTo: `/ai-agents/new?step=activate&agentId=${draftAgentId}` }))}>
              Open Test Lab
            </Button>
          ) : (
            <Button
              variant="primary"
              disabled={!readiness?.readyToActivate}
              onClick={() => navigate(scopedHref(`/ai-agents/${draftAgentId}`, { modal: 'activate' }))}
            >
              Review & Activate
            </Button>
          )}
        </>
      }
    >
      {step === 'purpose' ? (
        <PurposeFieldsForm value={purpose} onChange={setPurpose} showTemplatePicker={!draftAgent} />
      ) : step === 'knowledge' && draftAgentId ? (
        <KnowledgeManager agentId={draftAgentId} />
      ) : step === 'safety' && draftAgentId ? (
        <SafetyHandoverForm agentId={draftAgentId} />
      ) : step === 'test' ? (
        <div className="crm-aia__section" style={{ paddingTop: 0, borderTop: 'none' }}>
          <p>Run the standard test suite in Test Lab before activating this agent.</p>
        </div>
      ) : step === 'activate' && readiness ? (
        <div className="crm-aia__section" style={{ paddingTop: 0, borderTop: 'none' }}>
          <h3 className="crm-aia__section-title">Activation readiness</h3>
          <ReadinessChecklist readiness={readiness} onNavigate={goToStep} />
        </div>
      ) : null}
    </WizardShell>
  );
}
