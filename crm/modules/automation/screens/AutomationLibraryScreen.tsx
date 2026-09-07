import { useMemo, useState } from 'react';
import { Copy, MoreHorizontal, Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import {
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  IconButton,
  LoadingSkeleton,
  Popover,
  SearchField,
  Select,
  Tabs,
  type Column,
  type TabItem,
} from '@crm/design-system';
import { findUser, users } from '@crm/mock-data';
import { AutomationStatusBadge, TestedBadge } from '../components';
import type { AutomationFlow } from '../domain/types';
import { categoryLabel } from '../automation-labels';
import { distinctCategories, filterFlows, lifecycleCounts, type LibraryView } from '../automation-selectors';
import { can } from '../permissions';
import { archiveFlow, cloneFlow, deleteFlow, pauseFlow, resumeFlow, useFlows } from '../data';

const primaryTabs: { id: LibraryView; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'testing', label: 'Testing' },
  { id: 'live', label: 'Live' },
  { id: 'paused', label: 'Paused' },
  { id: 'inactive', label: 'Inactive' },
];

type ConfirmAction = { type: 'archive' | 'delete' | 'pause' | 'resume'; flow: AutomationFlow };

/**
 * AUT-S01 — Automation Library. All flows and operational lifecycle
 * management (AUTOMATION_GENERATION_SPEC.md §3). Lifecycle status is a
 * filter on this one screen, never a separate page.
 */
export default function AutomationLibraryScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { branchId, whatsappNumberId, role, currentUser } = useWorkspace();
  const flows = useFlows();

  const [menuFlowId, setMenuFlowId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const scope = {
    branchId: branchId === 'all' ? null : branchId,
    whatsappNumberId: whatsappNumberId === 'all' ? null : whatsappNumberId,
  };

  const view = (searchParams.get('view') as LibraryView | null) ?? 'all';
  const filters = {
    q: searchParams.get('q'),
    view,
    category: searchParams.get('category'),
    ownerId: searchParams.get('ownerId'),
  };

  const forcedState = searchParams.get('state');
  const isLoading = forcedState === 'loading';
  const forcedEmpty = forcedState === 'empty';
  const forcedNoResults = forcedState === 'no-results';
  const permissionDenied = !can(role, 'view');

  const rows = useMemo(
    () => (forcedEmpty || forcedNoResults ? [] : filterFlows(scope, filters, flows)),
    [forcedEmpty, forcedNoResults, scope.branchId, scope.whatsappNumberId, filters.q, filters.view, filters.category, filters.ownerId, flows],
  );

  const counts = lifecycleCounts(scope, flows);
  const categories = distinctCategories(flows);

  const setParam = (key: string, value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
      next.delete('state');
      return next;
    });
  };

  const hasFilters = Boolean(filters.q || filters.category || filters.ownerId);
  const clearAll = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['q', 'category', 'ownerId', 'state']) next.delete(key);
      return next;
    });

  const tabItems: TabItem[] = primaryTabs.map((tab) => ({ id: tab.id, label: tab.label, count: countFor(counts, tab.id) }));

  const menuFlow = menuFlowId ? rows.find((f) => f.id === menuFlowId) ?? flows.find((f) => f.id === menuFlowId) : undefined;

  const runConfirm = () => {
    if (!confirmAction) return;
    const { type, flow } = confirmAction;
    if (type === 'archive') archiveFlow(flow.id, currentUser.id);
    if (type === 'delete') deleteFlow(flow.id, currentUser.id);
    if (type === 'pause') pauseFlow(flow.id, currentUser.id, 'Paused from the Automation Library.');
    if (type === 'resume') resumeFlow(flow.id, currentUser.id);
    setConfirmAction(null);
  };

  const columns: Column<AutomationFlow>[] = [
    {
      key: 'name',
      header: 'Flow',
      width: '26%',
      render: (flow) => (
        <div>
          <p className="crm-aut-lib__name">{flow.name}</p>
          <p className="crm-aut-lib__purpose">{flow.purpose}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (flow) => <AutomationStatusBadge status={flow.status} /> },
    { key: 'tested', header: 'Tested', render: (flow) => <TestedBadge testedAt={flow.testedAt} changedSinceTest={flow.changedSinceTest} /> },
    { key: 'trigger', header: 'Trigger', render: (flow) => <span className="crm-aut-lib__muted">{flow.trigger.summary}</span> },
    {
      key: 'owner',
      header: 'Owner',
      render: (flow) => {
        const owner = findUser(flow.ownerId);
        return <span className="crm-aut-lib__muted">{owner?.name ?? 'Unknown'}</span>;
      },
    },
    { key: 'updated', header: 'Last updated', align: 'right', render: (flow) => <span className="crm-aut-lib__muted">{formatDate(flow.updatedAt)}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (flow) => (
        <div className="crm-aut-lib__row-actions" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" iconLeft={<Copy />} onClick={() => navigate(scopedHref(`/automation/${cloneFlow(flow.id, currentUser.id)?.id ?? flow.id}`))}>
            Clone
          </Button>
          <IconButton label="More actions" icon={<MoreHorizontal />} size="sm" onClick={() => setMenuFlowId(flow.id)} />
        </div>
      ),
    },
  ];

  const categoryOptions = [{ value: '', label: 'All types' }, ...categories.map((c) => ({ value: c, label: categoryLabel[c] ?? c }))];
  const ownerOptions = [{ value: '', label: 'All owners' }, ...users.filter((u) => u.role !== 'agent').map((u) => ({ value: u.id, label: u.name }))];

  if (permissionDenied) {
    return (
      <div className="crm-aut-lib">
        <PageHeader title="Journeys & Automation" description="Trigger-driven workflows, delays, data collection, actions and human handoff." />
        <EmptyState
          title="You do not have access to Automation"
          description={`Your role (${currentUser.roleLabel}) cannot view flows. Ask a workspace owner or manager if you need access.`}
          actions={<Button variant="secondary" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>}
        />
      </div>
    );
  }

  return (
    <div className="crm-aut-lib">
      <PageHeader
        title="Journeys & Automation"
        description="Trigger-driven workflows, delays, data collection, actions and human handoff."
        actions={
          <Button variant="primary" iconLeft={<Plus />} onClick={() => navigate(scopedHref('/automation/new'))} disabled={!can(role, 'create')} title={can(role, 'create') ? undefined : 'Your role cannot create flows.'}>
            New Flow
          </Button>
        }
        toolbar={<Tabs tabs={tabItems} activeId={view} ariaLabel="Flow lifecycle" onChange={(id) => setParam('view', id === 'all' ? null : id)} />}
      />

      <div className="crm-aut-lib__toolbar">
        <SearchField label="Search flows" placeholder="Search name, purpose or trigger…" width="320px" value={filters.q ?? ''} onChange={(e) => setParam('q', e.target.value)} />
        <div className="crm-aut-lib__filters">
          <Select label="Type" hideLabel size="sm" options={categoryOptions} value={filters.category ?? ''} onChange={(e) => setParam('category', e.target.value)} />
          <Select label="Owner" hideLabel size="sm" options={ownerOptions} value={filters.ownerId ?? ''} onChange={(e) => setParam('ownerId', e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div className="crm-aut-lib__loading">
          <LoadingSkeleton lines={6} />
        </div>
      ) : (
        <>
          <DataTable
            caption="Automation flows"
            columns={columns}
            rows={rows}
            rowKey={(flow) => flow.id}
            onRowClick={(flow) => navigate(scopedHref(`/automation/${flow.id}`))}
            emptyState={
              <EmptyState
                title={hasFilters ? 'No flows match these filters' : 'No flows yet'}
                description={hasFilters ? 'Try widening the filters, or clear them to see every flow.' : 'Start from a proven flow in the Starter Gallery.'}
                actions={
                  hasFilters ? (
                    <Button variant="secondary" onClick={clearAll}>Clear filters</Button>
                  ) : (
                    <Button variant="primary" iconLeft={<Plus />} onClick={() => navigate(scopedHref('/automation/new'))}>New Flow</Button>
                  )
                }
              />
            }
          />
          <p className="crm-aut-lib__count">{rows.length} flows</p>
        </>
      )}

      <Popover open={Boolean(menuFlow)} title={menuFlow ? menuFlow.name : 'Flow actions'} onClose={() => setMenuFlowId(null)}>
        {menuFlow ? (
          <div className="crm-aut-lib__menu">
            <button className="crm-aut-lib__menu-item" onClick={() => { setMenuFlowId(null); navigate(scopedHref(`/automation/${menuFlow.id}`)); }}>
              Open / Edit
            </button>
            <button className="crm-aut-lib__menu-item" onClick={() => { setMenuFlowId(null); navigate(scopedHref(`/automation/${menuFlow.id}`, { panel: 'test' })); }}>
              Test
            </button>
            {menuFlow.status !== 'live' ? (
              <button className="crm-aut-lib__menu-item" onClick={() => { setMenuFlowId(null); navigate(scopedHref(`/automation/${menuFlow.id}`, { modal: 'publish' })); }} disabled={!can(role, 'publish')}>
                Go Live
              </button>
            ) : null}
            {menuFlow.status === 'live' && can(role, 'pause') ? (
              <button className="crm-aut-lib__menu-item" onClick={() => { setMenuFlowId(null); setConfirmAction({ type: 'pause', flow: menuFlow }); }}>
                Pause
              </button>
            ) : null}
            {menuFlow.status === 'paused' && can(role, 'pause') ? (
              <button className="crm-aut-lib__menu-item" onClick={() => { setMenuFlowId(null); setConfirmAction({ type: 'resume', flow: menuFlow }); }}>
                Resume
              </button>
            ) : null}
            <button className="crm-aut-lib__menu-item" onClick={() => { setMenuFlowId(null); navigate(scopedHref(`/automation/${menuFlow.id}`, { panel: 'versions' })); }}>
              Versions
            </button>
            {menuFlow.status !== 'inactive' ? (
              <button className="crm-aut-lib__menu-item" onClick={() => { setMenuFlowId(null); setConfirmAction({ type: 'archive', flow: menuFlow }); }}>
                Archive
              </button>
            ) : null}
            {can(role, 'delete') ? (
              <button className="crm-aut-lib__menu-item crm-aut-lib__menu-item--danger" onClick={() => { setMenuFlowId(null); setConfirmAction({ type: 'delete', flow: menuFlow }); }}>
                Delete
              </button>
            ) : null}
          </div>
        ) : null}
      </Popover>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmTitle(confirmAction)}
        message={confirmMessage(confirmAction)}
        confirmLabel={confirmLabel(confirmAction)}
        tone={confirmAction?.type === 'delete' ? 'danger' : 'default'}
        onConfirm={runConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}

function countFor(counts: ReturnType<typeof lifecycleCounts>, view: LibraryView): number {
  switch (view) {
    case 'all': return counts.all;
    case 'draft': return counts.draft;
    case 'testing': return counts.testing;
    case 'live': return counts.live;
    case 'paused': return counts.paused;
    case 'inactive': return counts.inactive;
    default: return 0;
  }
}

function confirmTitle(action: ConfirmAction | null): string {
  if (!action) return '';
  switch (action.type) {
    case 'archive': return 'Archive this flow?';
    case 'delete': return 'Delete this flow?';
    case 'pause': return 'Pause this flow?';
    case 'resume': return 'Resume this flow?';
  }
}

function confirmMessage(action: ConfirmAction | null): string {
  if (!action) return '';
  switch (action.type) {
    case 'archive': return `"${action.flow.name}" will stop running and move to Inactive. Version history and audit log are kept.`;
    case 'delete': return `"${action.flow.name}" will be permanently deleted. This cannot be undone.`;
    case 'pause': return `"${action.flow.name}" will stop responding to new triggers until resumed.`;
    case 'resume': return `"${action.flow.name}" will go back to Live and start responding to triggers again.`;
  }
}

function confirmLabel(action: ConfirmAction | null): string {
  if (!action) return 'Confirm';
  switch (action.type) {
    case 'archive': return 'Archive flow';
    case 'delete': return 'Delete flow';
    case 'pause': return 'Pause flow';
    case 'resume': return 'Resume flow';
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
