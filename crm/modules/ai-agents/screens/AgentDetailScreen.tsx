import { useState } from 'react';
import { ArrowLeft, BarChart3, Pause, Play, Power, TestTube2, Trash2 } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { Button, ErrorState, PermissionRestricted, Tabs, type TabItem } from '@crm/design-system';
import { findUser } from '@crm/mock-data';
import { LifecycleBadge, TestStateBadge } from '../components/AgentBadges';
import { PurposeFieldsForm, toLanguages, toResponsibilities, type PurposeValue } from '../components/PurposeFieldsForm';
import { KnowledgeManager } from '../components/KnowledgeManager';
import { SafetyHandoverForm } from '../components/SafetyHandoverForm';
import { VersionsPanel } from '../components/VersionsPanel';
import { ActivityPanel } from '../components/ActivityPanel';
import { ReadinessChecklist } from '../components/ReadinessChecklist';
import { ActivateModal } from '../overlays/ActivateModal';
import { LifecycleModals } from '../overlays/LifecycleModals';
import { useAgent, useAiAgentsStore } from '../ai-agents-store';
import { useAgentReadiness } from '../use-agent-readiness';
import { can } from '../permissions';

const tabItems: TabItem[] = [
  { id: 'purpose', label: 'Purpose' },
  { id: 'knowledge', label: 'Knowledge' },
  { id: 'safety', label: 'Safety & Handover' },
  { id: 'versions', label: 'Versions' },
  { id: 'activity', label: 'Activity' },
];

/** AIA-S02 Agent Setup / Detail — tabs for ongoing editing (CODE_FIRST_ADAPTER.md `/ai-agents/:agentId`). */
export default function AgentDetailScreen() {
  const { agentId } = useParams<{ agentId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role, visibleModules, currentUser } = useWorkspace();
  const { dispatch } = useAiAgentsStore();
  const agent = useAgent(agentId);
  const readiness = useAgentReadiness(agentId);

  const tab = searchParams.get('tab') ?? 'purpose';
  const setTab = (id: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', id);
      return next;
    });

  const [purpose, setPurpose] = useState<PurposeValue | null>(null);

  if (!visibleModules.includes('ai-assistance')) {
    return <PermissionRestricted title="You do not have access to AI Agents" description={`Your role (${currentUser.roleLabel}) cannot open this area.`} />;
  }

  if (!agent) {
    return (
      <ErrorState
        title="Agent not found"
        description="This agent may have been deleted or the link is out of date."
        actions={<Button variant="secondary" onClick={() => navigate(scopedHref('/ai-agents'))}>Back to AI Agents</Button>}
      />
    );
  }

  const value: PurposeValue =
    purpose ?? {
      name: agent.name,
      useCase: agent.useCase,
      objective: agent.objective,
      responsibilities: agent.responsibilities.join('\n'),
      instructions: agent.instructions,
      tone: agent.tone,
      supportedLanguages: agent.supportedLanguages.join(', '),
    };

  const canEdit = can(role, 'ai_agent.edit');
  const canActivate = can(role, 'ai_agent.activate');
  const canPause = can(role, 'ai_agent.pause');
  const canDelete = can(role, 'ai_agent.delete');

  const savePurpose = (next: PurposeValue) => {
    setPurpose(next);
    dispatch({
      type: 'UPDATE_PURPOSE',
      agentId: agent.id,
      fields: {
        name: next.name.trim(),
        useCase: next.useCase,
        objective: next.objective.trim(),
        responsibilities: toResponsibilities(next.responsibilities),
        instructions: next.instructions.trim(),
        tone: next.tone.trim(),
        supportedLanguages: toLanguages(next.supportedLanguages),
      },
      actorId: currentUser.id,
    });
  };

  return (
    <div className="crm-aia__page">
      <PageHeader
        title={agent.name}
        description={`Owned by ${findUser(agent.ownerId)?.name ?? 'Unknown'}`}
        breadcrumbs={[{ label: 'AI Agents', to: scopedHref('/ai-agents') }, { label: agent.name }]}
        actions={
          <>
            <Button variant="secondary" iconLeft={<ArrowLeft />} onClick={() => navigate(scopedHref('/ai-agents'))}>Back</Button>
            <Button variant="secondary" iconLeft={<TestTube2 />} onClick={() => navigate(scopedHref(`/ai-agents/${agent.id}/test`))}>Test</Button>
            {agent.lifecycleStatus === 'active' && canPause ? (
              <Button variant="secondary" iconLeft={<Pause />} onClick={() => navigate(scopedHref(`/ai-agents/${agent.id}`, { tab, modal: 'pause' }))}>Pause</Button>
            ) : agent.lifecycleStatus === 'paused' && canPause ? (
              <Button variant="secondary" iconLeft={<Play />} onClick={() => dispatch({ type: 'RESUME', agentId: agent.id, actorId: currentUser.id })}>Resume</Button>
            ) : canActivate ? (
              <Button variant="primary" iconLeft={<Play />} onClick={() => navigate(scopedHref(`/ai-agents/${agent.id}`, { tab, modal: 'activate' }))}>Activate</Button>
            ) : null}
            {(agent.lifecycleStatus === 'active' || agent.lifecycleStatus === 'paused') && canPause ? (
              <Button variant="secondary" iconLeft={<Power />} onClick={() => navigate(scopedHref(`/ai-agents/${agent.id}`, { tab, modal: 'deactivate' }))}>Deactivate</Button>
            ) : null}
            <Button variant="secondary" iconLeft={<BarChart3 />} onClick={() => navigate(scopedHref('/ai-agents/usage', { agent: agent.id }))}>Usage</Button>
            {canDelete ? (
              <Button variant="ghost" iconLeft={<Trash2 />} onClick={() => navigate(scopedHref(`/ai-agents/${agent.id}`, { tab, modal: 'delete' }))}>Delete</Button>
            ) : null}
          </>
        }
        toolbar={<Tabs tabs={tabItems} activeId={tab} ariaLabel="Agent setup" onChange={setTab} />}
      />

      <div className="crm-aia__badge-row">
        <LifecycleBadge status={agent.lifecycleStatus} />
        <TestStateBadge testedAt={agent.testedAt} changedSinceTest={agent.changedSinceTest} />
      </div>

      <div className="crm-aia__detail">
        <div className="crm-aia__main">
          <div className="crm-aia__card">
            {tab === 'purpose' ? (
              <PurposeFieldsForm value={value} onChange={setPurpose} />
            ) : tab === 'knowledge' ? (
              <KnowledgeManager agentId={agent.id} />
            ) : tab === 'safety' ? (
              <SafetyHandoverForm agentId={agent.id} />
            ) : tab === 'versions' ? (
              <VersionsPanel agentId={agent.id} />
            ) : (
              <ActivityPanel agentId={agent.id} />
            )}
            {tab === 'purpose' && canEdit ? (
              <div className="crm-aia__form-actions">
                <Button variant="primary" onClick={() => savePurpose(value)}>Save Purpose</Button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="crm-aia__rail">
          {readiness ? (
            <div className="crm-aia__card">
              <h3 className="crm-aia__card-title">Activation readiness</h3>
              <ReadinessChecklist readiness={readiness} onNavigate={(to) => (to === 'test' ? navigate(scopedHref(`/ai-agents/${agent.id}/test`)) : setTab(to))} />
            </div>
          ) : null}
        </div>
      </div>

      <ActivateModal agentId={agent.id} />
      <LifecycleModals agentId={agent.id} />
    </div>
  );
}
