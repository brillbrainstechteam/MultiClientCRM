import { useState } from 'react';
import { Download, PauseCircle, PhoneCall, PlayCircle, Users, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { Button, DataTable, EmptyState, KpiCard, Toast, type Column } from '@crm/design-system';
import { findContact, findTeam, findUser } from '@crm/mock-data';
import { useCallingData } from '../calling-data-context';
import { AssignmentModal, CloseListModal, ContactCell, DispositionBadge, ListStatusBadge, TaskStatusBadge, type CloseListAction } from '../components';
import { isOpenTask, listProgress, sortQueue } from '../calling-selectors';
import { findCallingNumber, findCallList } from '../data';
import { providerCapabilitiesFor, referenceNow, type CallTask } from '../domain';
import { can } from '../permissions';

/** CALL-S09 — Call List Detail: identity, KPIs and customer-level progress. */
export default function CallListDetailScreen() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role, currentUser } = useWorkspace();
  const { lists, tasks, attempts, updateList, updateTask, bulkUpdateTasks } = useCallingData();

  const [assignOpen, setAssignOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const list = lists.find((l) => l.id === listId) ?? (listId ? findCallList(listId) : undefined);

  if (!list) {
    return (
      <div className="crm-list-detail">
        <EmptyState
          title="Call list not found"
          description="It may have been removed."
          actions={
            <Button variant="secondary" onClick={() => navigate(scopedHref('/calling/lists'))}>
              Back to Call Lists
            </Button>
          }
        />
      </div>
    );
  }

  const listTasks = list.taskIds
    .map((id) => tasks.find((t) => t.id === id))
    .filter((t): t is CallTask => !!t);
  const progress = listProgress(list, tasks, attempts);
  const remainingTasks = listTasks.filter(isOpenTask);
  const owner = findUser(list.ownerId);
  const team = list.teamId ? findTeam(list.teamId) : null;

  const startCalling = () => {
    const next =
      sortQueue(remainingTasks.filter((t) => t.assigneeId === currentUser.id), referenceNow())[0] ??
      sortQueue(remainingTasks, referenceNow())[0];
    if (!next) return;
    const number = findCallingNumber(next.numberId);
    const mode = providerCapabilitiesFor(number).clickToCall ? 'provider' : 'manual';
    navigate(scopedHref(`/calling/task/${next.id}`, { mode }));
  };

  const togglePause = () => {
    const nextStatus = list.status === 'paused' ? 'active' : 'paused';
    updateList(list.id, { status: nextStatus });
    setToast(nextStatus === 'paused' ? 'List paused.' : 'List resumed.');
  };

  const closeList = (action: CloseListAction) => {
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    if (action === 'move-to-queue') {
      for (const task of remainingTasks) updateTask(task.id, { listId: null });
      updateList(list.id, {
        status: 'closed',
        closedNote: `${remainingTasks.length} remaining calls were moved back to the open queue on ${today}.`,
      });
    } else {
      for (const task of remainingTasks) updateTask(task.id, { status: 'cancelled' });
      updateList(list.id, {
        status: 'closed',
        closedNote: `${remainingTasks.length} remaining calls were cancelled on ${today}.`,
      });
    }
    setCloseOpen(false);
    setToast('List closed.');
  };

  const requestClose = () => {
    if (remainingTasks.length === 0) {
      updateList(list.id, { status: 'closed', closedNote: null });
      setToast('List closed — all calls had reached a terminal outcome.');
      return;
    }
    setCloseOpen(true);
  };

  const columns: Column<CallTask>[] = [
    {
      key: 'customer',
      header: 'Customer',
      width: '24%',
      render: (task) => {
        const contact = findContact(task.contactId);
        return contact ? <ContactCell contact={contact} to={scopedHref(`/calling/task/${task.id}`)} /> : task.contactId;
      },
    },
    {
      key: 'assignee',
      header: 'Call assignee',
      render: (task) => (task.assigneeId ? findUser(task.assigneeId)?.name ?? task.assigneeId : 'Unassigned'),
    },
    {
      key: 'owner',
      header: 'Contact owner',
      render: (task) => (task.contactOwnerId ? findUser(task.contactOwnerId)?.name ?? task.contactOwnerId : 'Unowned'),
    },
    { key: 'status', header: 'Status', render: (task) => <TaskStatusBadge status={task.status} /> },
    {
      key: 'disposition',
      header: 'Latest disposition',
      render: (task) => (task.latestDisposition ? <DispositionBadge disposition={task.latestDisposition} /> : <span className="crm-list-detail__muted">—</span>),
    },
    { key: 'attempts', header: 'Attempts', align: 'right', render: (task) => task.attemptCount },
    { key: 'due', header: 'Due', render: (task) => formatDate(task.dueAt) },
  ];

  return (
    <div className="crm-list-detail">
      <PageHeader
        title={list.name}
        description={list.source}
        breadcrumbs={[{ label: 'Call Lists', to: scopedHref('/calling/lists') }, { label: list.name }]}
        actions={
          <>
            {can(role, 'calling.view_analytics') ? (
              <Button variant="ghost" onClick={() => navigate(scopedHref('/calling/analytics', { listId: list.id }))}>
                View Analytics
              </Button>
            ) : null}
            {can(role, 'calling.export') ? (
              <Button variant="ghost" iconLeft={<Download />} onClick={() => setToast('Export started (simulated).')}>
                Export
              </Button>
            ) : null}
            {can(role, 'calling.assign') && list.status !== 'closed' ? (
              <Button variant="secondary" iconLeft={<Users />} onClick={() => setAssignOpen(true)}>
                Assign / Redistribute
              </Button>
            ) : null}
            {can(role, 'calling.create_list') && (list.status === 'active' || list.status === 'paused') ? (
              <Button
                variant="secondary"
                iconLeft={list.status === 'paused' ? <PlayCircle /> : <PauseCircle />}
                onClick={togglePause}
              >
                {list.status === 'paused' ? 'Resume' : 'Pause'}
              </Button>
            ) : null}
            {can(role, 'calling.create_list') && list.status !== 'closed' ? (
              <Button variant="ghost" iconLeft={<XCircle />} onClick={requestClose}>
                Close List
              </Button>
            ) : null}
            {list.status !== 'closed' && remainingTasks.length > 0 ? (
              <Button variant="primary" iconLeft={<PhoneCall />} onClick={startCalling}>
                Start Calling
              </Button>
            ) : null}
          </>
        }
      />

      <div className="crm-list-detail__meta">
        <ListStatusBadge status={list.status} />
        <span>Owner: {owner ? owner.name : list.ownerId}</span>
        <span>Team: {team ? team.name : 'Unassigned'}</span>
        <span>Created: {formatDate(list.createdAt)}</span>
      </div>

      {list.closedNote ? <p className="crm-list-detail__closed-note">{list.closedNote}</p> : null}

      <div className="crm-list-detail__kpis">
        <KpiCard label="Total" value={progress.total} />
        <KpiCard label="Attempted" value={progress.attempted} />
        <KpiCard label="Connected" value={progress.connected} />
        <KpiCard label="Follow-ups" value={progress.followUps} />
        <KpiCard label="Completed" value={progress.completed} />
        <KpiCard label="Remaining" value={progress.remaining} emphasis={progress.remaining > 0 ? 'gold' : 'default'} />
      </div>

      <DataTable
        caption={`${list.name} calling progress`}
        columns={columns}
        rows={listTasks}
        rowKey={(t) => t.id}
        emptyState={<EmptyState title="No calls in this list" description="This list has no call tasks." />}
      />

      <AssignmentModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        taskIds={remainingTasks.map((t) => t.id)}
        tasks={listTasks}
        onAssign={(assignments) => {
          for (const [taskId, agentId] of Object.entries(assignments)) {
            bulkUpdateTasks([taskId], { assigneeId: agentId });
          }
          setToast('Assignment updated. Contact owner is unchanged.');
        }}
      />

      <CloseListModal
        open={closeOpen}
        remainingCount={remainingTasks.length}
        onClose={() => setCloseOpen(false)}
        onConfirm={closeList}
      />

      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
