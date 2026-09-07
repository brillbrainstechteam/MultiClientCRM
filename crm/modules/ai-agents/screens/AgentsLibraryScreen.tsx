import { useMemo, useState } from 'react';
import { Copy, MoreVertical, Pause, Play, Plus, Power, Trash2, BarChart3 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  IconButton,
  LoadingSkeleton,
  PermissionRestricted,
  Popover,
  SearchField,
  Select,
  Tabs,
  type Column,
  type TabItem,
} from '@crm/design-system';
import { findUser } from '@crm/mock-data';
import { LifecycleBadge, ReadinessPip, TestStateBadge } from '../components/AgentBadges';
import { Phase2Previews } from '../components/Phase2Previews';
import { useAgents, useAiAgentsStore, useUsageSummary } from '../ai-agents-store';
import { useAgentReadiness } from '../use-agent-readiness';
import { can } from '../permissions';
import { useCaseLabel } from '../ai-agents-labels';
import { filterAgents, lifecycleCounts, type LibraryView } from '../ai-agents-selectors';
import type { AiAgent } from '../domain/types';

const tabDefs: { id: LibraryView; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'ready-to-test', label: 'Ready to Test' },
  { id: 'active', label: 'Active' },
  { id: 'paused', label: 'Paused' },
  { id: 'inactive', label: 'Inactive' },
];

/** AIA-S01 — Agents Library. Lifecycle filters, search, readiness/trust badges, role-aware actions. */
export default function AgentsLibraryScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role, branchId, whatsappNumberId, visibleModules, currentUser } = useWorkspace();
  const { state, dispatch } = useAiAgentsStore();
  const agents = useAgents();
  const [menuAgentId, setMenuAgentId] = useState<string | null>(null);

  if (!visibleModules.includes('ai-assistance')) {
    return (
      <PermissionRestricted
        title="You do not have access to AI Agents"
        description={`Your role (${currentUser.roleLabel}) cannot open this area. Ask a workspace owner if you need access.`}
      />
    );
  }

  const view = (searchParams.get('view') as LibraryView | null) ?? 'all';
  const q = searchParams.get('q');
  const useCase = searchParams.get('useCase');
  const ownerId = searchParams.get('ownerId');
  const forcedState = searchParams.get('state');
  const isLoading = forcedState === 'loading';
  const forcedEmpty = forcedState === 'empty';

  const scope = {
    branchId: branchId === 'all' ? null : branchId,
    whatsappNumberId: whatsappNumberId === 'all' ? null : whatsappNumberId,
  };

  const rows = useMemo(
    () => (forcedEmpty ? [] : filterAgents(agents, scope, { q, view, useCase, ownerId })),
    [forcedEmpty, agents, scope.branchId, scope.whatsappNumberId, q, view, useCase, ownerId],
  );
  const counts = lifecycleCounts(agents, scope);

  const setParam = (key: string, value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
      next.delete('state');
      return next;
    });
  };

  const tabItems: TabItem[] = tabDefs.map((tab) => ({
    id: tab.id,
    label: tab.label,
    count:
      tab.id === 'all' ? counts.all
      : tab.id === 'draft' ? counts.draft
      : tab.id === 'ready-to-test' ? counts.readyToTest
      : tab.id === 'active' ? counts.active
      : tab.id === 'paused' ? counts.paused
      : counts.inactive,
  }));

  const canCreate = can(role, 'ai_agent.create');
  const canDelete = can(role, 'ai_agent.delete');
  const canActivate = can(role, 'ai_agent.activate');
  const canPause = can(role, 'ai_agent.pause');

  const ownerOptions = [
    { value: '', label: 'All owners' },
    ...Array.from(new Set(agents.map((a) => a.ownerId))).map((id) => ({ value: id, label: findUser(id)?.name ?? id })),
  ];
  const useCaseOptions = [{ value: '', label: 'All use cases' }, ...Object.entries(useCaseLabel).map(([value, label]) => ({ value, label }))];

  const hasFilters = Boolean(q) || Boolean(useCase) || Boolean(ownerId);
  const clearAll = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['q', 'useCase', 'ownerId', 'state']) next.delete(key);
      return next;
    });

  const columns: Column<AiAgent>[] = [
    {
      key: 'name',
      header: 'Agent',
      width: '24%',
      render: (agent) => (
        <div className="crm-aia__identity">
          <p className="crm-aia__name">{agent.name}</p>
          <p className="crm-aia__use-case">{useCaseLabel[agent.useCase]}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (agent) => <LifecycleBadge status={agent.lifecycleStatus} /> },
    { key: 'tested', header: 'Test state', render: (agent) => <TestStateBadge testedAt={agent.testedAt} changedSinceTest={agent.changedSinceTest} /> },
    { key: 'readiness', header: 'Readiness', render: (agent) => <RowReadiness agentId={agent.id} /> },
    { key: 'usage', header: 'Usage', render: (agent) => <RowUsageAlert agentId={agent.id} /> },
    { key: 'owner', header: 'Owner', render: (agent) => findUser(agent.ownerId)?.name ?? 'Unknown' },
    { key: 'updated', header: 'Updated', align: 'right', render: (agent) => <span className="crm-aia__muted">{formatDate(agent.updatedAt)}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (agent) => (
        <RowActions
          agent={agent}
          canActivate={canActivate}
          canPause={canPause}
          canDelete={canDelete}
          menuOpen={menuAgentId === agent.id}
          onToggleMenu={() => setMenuAgentId((current) => (current === agent.id ? null : agent.id))}
          onCloseMenu={() => setMenuAgentId(null)}
          onOpen={() => navigate(scopedHref(`/ai-agents/${agent.id}`))}
          onTest={() => navigate(scopedHref(`/ai-agents/${agent.id}/test`))}
          onActivate={() => navigate(scopedHref(`/ai-agents/${agent.id}`, { modal: 'activate' }))}
          onPause={() => navigate(scopedHref(`/ai-agents/${agent.id}`, { modal: 'pause' }))}
          onResume={() => dispatch({ type: 'RESUME', agentId: agent.id, actorId: currentUser.id })}
          onDeactivate={() => navigate(scopedHref(`/ai-agents/${agent.id}`, { modal: 'deactivate' }))}
          onClone={() => {
            const newId = `agent_clone_${state.nextSeq}`;
            const newAgent: AiAgent = {
              ...agent,
              id: newId,
              name: `${agent.name} (Copy)`,
              lifecycleStatus: 'draft',
              testedAt: null,
              changedSinceTest: false,
              activeVersionId: null,
              draftVersionId: `ver_clone_${state.nextSeq}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            dispatch({
              type: 'CLONE',
              sourceAgentId: agent.id,
              newAgent,
              newVersion: { id: newAgent.draftVersionId, agentId: newId, number: 1, label: 'draft', snapshotSummary: `Cloned from ${agent.name}.`, createdBy: currentUser.id, createdAt: newAgent.createdAt, testedAt: null, activatedAt: null, note: null },
              actorId: currentUser.id,
            });
            navigate(scopedHref(`/ai-agents/${newId}`));
          }}
          onViewUsage={() => navigate(scopedHref('/ai-agents/usage', { agent: agent.id }))}
          onDelete={() => navigate(scopedHref(`/ai-agents/${agent.id}`, { modal: 'delete' }))}
        />
      ),
    },
  ];

  return (
    <div className="crm-aia__page">
      <PageHeader
        title="AI Agents"
        description="Define a role, knowledge, permissions and safety boundaries — test it, then activate it."
        actions={
          <Button
            variant="primary"
            iconLeft={<Plus />}
            onClick={() => navigate(scopedHref('/ai-agents/new', { step: 'purpose' }))}
            disabled={!canCreate}
            title={canCreate ? undefined : 'Your role cannot create agents.'}
          >
            Create Agent
          </Button>
        }
        toolbar={
          <Tabs tabs={tabItems} activeId={view} ariaLabel="Agent lifecycle" onChange={(id) => setParam('view', id === 'all' ? null : id)} />
        }
      />

      <div className="crm-aia__toolbar">
        <SearchField
          label="Search agents"
          placeholder="Search by name or use case…"
          width="320px"
          value={q ?? ''}
          onChange={(e) => setParam('q', e.target.value)}
        />
        <div className="crm-aia__filters">
          <Select label="Use case" hideLabel size="sm" options={useCaseOptions} value={useCase ?? ''} onChange={(e) => setParam('useCase', e.target.value)} />
          <Select label="Owner" hideLabel size="sm" options={ownerOptions} value={ownerId ?? ''} onChange={(e) => setParam('ownerId', e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div className="crm-aia__card">
          <LoadingSkeleton lines={6} />
        </div>
      ) : (
        <>
          <DataTable
            caption="AI Agents"
            columns={columns}
            rows={rows}
            rowKey={(agent) => agent.id}
            onRowClick={(agent) => navigate(scopedHref(`/ai-agents/${agent.id}`))}
            emptyState={
              <EmptyState
                title={hasFilters || q ? 'No agents match these filters' : 'No AI agents yet'}
                description={
                  hasFilters || q
                    ? 'Try widening the filters, or clear them to see every agent.'
                    : 'Create your first AI agent — define its role, knowledge and safety boundaries, then test it before going live.'
                }
                actions={
                  hasFilters || q ? (
                    <Button variant="secondary" onClick={clearAll}>Clear filters</Button>
                  ) : (
                    <Button variant="primary" iconLeft={<Plus />} onClick={() => navigate(scopedHref('/ai-agents/new', { step: 'purpose' }))} disabled={!canCreate}>
                      Create Agent
                    </Button>
                  )
                }
              />
            }
          />
          <p className="crm-aia__count">{rows.length} agents</p>
        </>
      )}

      <div className="crm-aia__card">
        <Phase2Previews />
      </div>
    </div>
  );
}

function RowReadiness({ agentId }: { agentId: string }) {
  const readiness = useAgentReadiness(agentId);
  if (!readiness) return null;
  return (
    <div className="crm-aia__badge-row">
      <ReadinessPip ready={readiness.knowledgeReady} label="Knowledge" />
      <ReadinessPip ready={readiness.safetyConfigured && readiness.handoverConfigured} label="Safety" />
    </div>
  );
}

function RowUsageAlert({ agentId }: { agentId: string }) {
  const usage = useUsageSummary(agentId);
  if (!usage || usage.thresholdState === 'ok') return <span className="crm-aia__muted">—</span>;
  return <Badge tone={usage.thresholdState === 'exceeded' ? 'danger' : 'warning'}>{usage.thresholdState === 'exceeded' ? 'Over budget' : 'Near threshold'}</Badge>;
}

function RowActions({
  agent,
  canActivate,
  canPause,
  canDelete,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onOpen,
  onTest,
  onActivate,
  onPause,
  onResume,
  onDeactivate,
  onClone,
  onViewUsage,
  onDelete,
}: {
  agent: AiAgent;
  canActivate: boolean;
  canPause: boolean;
  canDelete: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onOpen: () => void;
  onTest: () => void;
  onActivate: () => void;
  onPause: () => void;
  onResume: () => void;
  onDeactivate: () => void;
  onClone: () => void;
  onViewUsage: () => void;
  onDelete: () => void;
}) {
  const primaryLabel =
    agent.lifecycleStatus === 'active' ? 'Pause'
    : agent.lifecycleStatus === 'paused' ? 'Resume'
    : 'Activate';

  return (
    <div className="crm-aia__row-actions" onClick={(e) => e.stopPropagation()}>
      <Button variant="ghost" size="sm" onClick={onTest}>Test</Button>
      {primaryLabel === 'Pause' && canPause ? (
        <Button variant="ghost" size="sm" iconLeft={<Pause />} onClick={onPause}>Pause</Button>
      ) : primaryLabel === 'Resume' && canPause ? (
        <Button variant="ghost" size="sm" iconLeft={<Play />} onClick={onResume}>Resume</Button>
      ) : canActivate ? (
        <Button variant="ghost" size="sm" iconLeft={<Play />} onClick={onActivate}>Activate</Button>
      ) : null}
      <div style={{ position: 'relative' }}>
        <IconButton label="More actions" icon={<MoreVertical />} size="sm" onClick={onToggleMenu} />
        <Popover open={menuOpen} title={agent.name} onClose={onCloseMenu}>
          <div className="crm-aia__picker-list">
            <Button variant="ghost" size="sm" onClick={() => { onCloseMenu(); onOpen(); }}>Open</Button>
            <Button variant="ghost" size="sm" iconLeft={<Copy />} onClick={() => { onCloseMenu(); onClone(); }}>Clone</Button>
            <Button variant="ghost" size="sm" iconLeft={<BarChart3 />} onClick={() => { onCloseMenu(); onViewUsage(); }}>View Usage</Button>
            {agent.lifecycleStatus === 'active' || agent.lifecycleStatus === 'paused' ? (
              <Button variant="ghost" size="sm" iconLeft={<Power />} onClick={() => { onCloseMenu(); onDeactivate(); }}>Deactivate</Button>
            ) : null}
            {canDelete ? (
              <Button variant="ghost" size="sm" iconLeft={<Trash2 />} onClick={() => { onCloseMenu(); onDelete(); }}>Delete</Button>
            ) : null}
          </div>
        </Popover>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
