import { Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { Button, DataTable, EmptyState, Tabs, type Column, type TabItem } from '@crm/design-system';
import { findTeam, findUser } from '@crm/mock-data';
import { useCallingData } from '../calling-data-context';
import { ListStatusBadge } from '../components';
import { listProgress, listsVisibleToRole } from '../calling-selectors';
import type { CallList, CallListStatus } from '../domain';
import { can } from '../permissions';

const tabs: TabItem[] = [
  { id: 'active', label: 'Active' },
  { id: 'paused', label: 'Paused' },
  { id: 'completed', label: 'Completed' },
  { id: 'closed', label: 'Closed' },
];

/** CALL-S08 — Call Lists: managed batches of calling work. */
export default function CallListsScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role, currentUser } = useWorkspace();
  const { lists, tasks, attempts } = useCallingData();

  const status = (searchParams.get('status') as CallListStatus | null) ?? 'active';

  const visible = listsVisibleToRole(lists, tasks, currentUser, role);
  const rows = visible.filter((list) => list.status === status);

  const setStatus = (id: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('status', id);
      return next;
    });
  };

  const columns: Column<CallList>[] = [
    {
      key: 'name',
      header: 'List name',
      render: (list) => (
        <button type="button" className="crm-lists__name" onClick={() => navigate(scopedHref(`/calling/lists/${list.id}`))}>
          {list.name}
        </button>
      ),
    },
    { key: 'source', header: 'Source', render: (list) => <span className="crm-lists__muted">{list.source}</span> },
    {
      key: 'assignees',
      header: 'Assignees',
      render: (list) => {
        const names = list.assigneeIds.map((id) => findUser(id)?.name ?? id);
        if (names.length === 0) {
          return <span className="crm-lists__muted">{list.teamId ? findTeam(list.teamId)?.name ?? 'Team' : 'Unassigned'}</span>;
        }
        return (
          <span title={names.join(', ')}>
            {names[0]}
            {names.length > 1 ? <span className="crm-lists__muted"> +{names.length - 1}</span> : null}
          </span>
        );
      },
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (list) => listProgress(list, tasks, attempts).total,
    },
    {
      key: 'completed',
      header: 'Completed',
      align: 'right',
      render: (list) => listProgress(list, tasks, attempts).completed,
    },
    {
      key: 'remaining',
      header: 'Remaining',
      align: 'right',
      render: (list) => listProgress(list, tasks, attempts).remaining,
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (list) => {
        const progress = listProgress(list, tasks, attempts);
        const pct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
        return (
          <div className="crm-lists__progress">
            <div className="crm-lists__progress-track">
              <div className="crm-lists__progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <span>{pct}%</span>
          </div>
        );
      },
    },
    { key: 'status', header: 'Status', render: (list) => <ListStatusBadge status={list.status} /> },
    {
      key: 'callDate',
      header: 'Call date',
      render: (list) => (list.callDate ? formatDate(list.callDate) : <span className="crm-lists__muted">—</span>),
    },
    {
      key: 'created',
      header: 'Created',
      render: (list) => <span className="crm-lists__muted">{formatDate(list.createdAt)}</span>,
    },
  ];

  return (
    <div className="crm-lists">
      <PageHeader
        title="Call Lists"
        description="Managed batches of calling work — create, assign and track distribution."
        actions={
          can(role, 'calling.create_list') ? (
            <Button variant="primary" iconLeft={<Plus />} onClick={() => navigate(scopedHref('/calling/lists/new'))}>
              Create Call List
            </Button>
          ) : undefined
        }
      />

      <Tabs tabs={tabs} activeId={status} onChange={setStatus} ariaLabel="Call list status" />

      <DataTable
        caption="Call lists"
        columns={columns}
        rows={rows}
        rowKey={(l) => l.id}
        onRowClick={(list) => navigate(scopedHref(`/calling/lists/${list.id}`))}
        emptyState={
          <EmptyState
            title={`No ${status} lists`}
            description={
              status === 'active'
                ? 'Create a call list to distribute outreach work across your team.'
                : `No lists are currently ${status}.`
            }
            actions={
              status === 'active' && can(role, 'calling.create_list') ? (
                <Button variant="secondary" onClick={() => navigate(scopedHref('/calling/lists/new'))}>
                  Create Call List
                </Button>
              ) : undefined
            }
          />
        }
      />
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
