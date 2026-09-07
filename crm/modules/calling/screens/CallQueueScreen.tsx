import { useMemo, useState } from 'react';
import { Eye, MessageSquare, MoreHorizontal, Phone, User as UserIcon } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import {
  Avatar,
  Button,
  DataTable,
  EmptyState,
  IconButton,
  LoadingSkeleton,
  Popover,
  SearchField,
  Select,
  type Column,
} from '@crm/design-system';
import { findContact, findUser, users } from '@crm/mock-data';
import { useCallingData } from '../calling-data-context';
import {
  AssignmentModal,
  ContactCell,
  PriorityBadge,
  ProviderDisconnectedBanner,
  ProviderFailureBanner,
  QuickPreviewDrawer,
  RescheduleModal,
  TaskStatusBadge,
} from '../components';
import {
  applyBranchScope,
  applyQueueFilters,
  applyQueueView,
  attemptsForContact,
  searchTasks,
  sortQueue,
  tasksVisibleToRole,
} from '../calling-selectors';
import { callingNumbers, findCallingNumber, savedQueueViews } from '../data';
import { computeQueuePriority, providerCapabilitiesFor, referenceNow, type CallTask } from '../domain';
import { inboxHandoffPath } from '../inbox-handoff';
import { can } from '../permissions';

export default function CallQueueScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role, currentUser, branchId } = useWorkspace();
  const { tasks, attempts, bulkUpdateTasks } = useCallingData();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menuTaskId, setMenuTaskId] = useState<string | null>(null);
  const [assignTaskIds, setAssignTaskIds] = useState<string[] | null>(null);
  const [rescheduleTaskIds, setRescheduleTaskIds] = useState<string[] | null>(null);

  const viewId = searchParams.get('view') ?? 'today';
  const state = searchParams.get('state');
  const q = searchParams.get('q') ?? '';
  const assigneeFilter = searchParams.get('assigneeId');
  const lifecycleFilter = searchParams.get('lifecycle');
  const previewTaskId = searchParams.get('taskId');
  const drawerOpen = searchParams.get('drawer') === 'preview' && !!previewTaskId;
  const modalOpen = searchParams.get('modal') === 'bulk-assign';

  const setParam = (key: string, value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
      return next;
    });
  };

  const setView = (id: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('view', id);
      next.delete('state');
      return next;
    });
    setSelected(new Set());
  };

  const scoped = tasksVisibleToRole(
    applyBranchScope(tasks, branchId === 'all' ? null : branchId),
    currentUser,
    role,
  );

  const viewCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const view of savedQueueViews) {
      counts[view.id] = applyQueueView(scoped, view.id, { userId: currentUser.id }).length;
    }
    return counts;
  }, [scoped, currentUser.id]);

  const forcedEmpty = state === 'empty';
  const forcedNoResults = state === 'no-results';
  const providerFailure = state === 'provider-failure';

  const activeView = savedQueueViews.find((v) => v.id === viewId) ?? savedQueueViews[1];

  let rows: CallTask[] = forcedEmpty || activeView.phase2 ? [] : applyQueueView(scoped, viewId, { userId: currentUser.id });
  rows = applyQueueFilters(rows, { assigneeId: assigneeFilter, lifecycle: lifecycleFilter });
  rows = searchTasks(rows, q);
  if (forcedNoResults) rows = [];
  rows = sortQueue(rows, referenceNow());

  const scopedNumbers = callingNumbers.filter((n) => branchId === 'all' || n.branchId === branchId);
  const providerConnected = scopedNumbers.some((n) => n.providerConnected);

  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) => (prev.size >= rows.length ? new Set() : new Set(rows.map((r) => r.id))));

  const callHref = (task: CallTask) => {
    const number = findCallingNumber(task.numberId);
    const capable = providerCapabilitiesFor(number).clickToCall;
    return scopedHref(`/calling/task/${task.id}`, capable ? { mode: 'provider' } : { mode: 'manual' });
  };

  const menuTask = menuTaskId ? rows.find((r) => r.id === menuTaskId) ?? scoped.find((r) => r.id === menuTaskId) : null;
  const menuContact = menuTask ? findContact(menuTask.contactId) : null;

  const previewTask = previewTaskId ? scoped.find((t) => t.id === previewTaskId) : undefined;

  const columns: Column<CallTask>[] = [
    {
      key: 'customer',
      header: 'Customer',
      width: '22%',
      render: (task) => {
        const contact = findContact(task.contactId);
        return contact ? <ContactCell contact={contact} to={scopedHref(`/calling/task/${task.id}`)} /> : task.contactId;
      },
    },
    {
      key: 'due',
      header: 'Due',
      render: (task) => <span className="crm-queue__due">{formatDue(task.dueAt)}</span>,
    },
    {
      key: 'reason',
      header: 'Queue reason',
      render: (task) => <PriorityBadge priority={computeQueuePriority(task, referenceNow())} />,
    },
    {
      key: 'assignee',
      header: 'Assignee',
      render: (task) => {
        const assignee = task.assigneeId ? findUser(task.assigneeId) : null;
        return assignee ? (
          <span className="crm-queue__assignee">
            <Avatar initials={assignee.initials} name={assignee.name} size="sm" />
            {assignee.name}
          </span>
        ) : (
          <span className="crm-queue__unassigned">Unassigned</span>
        );
      },
    },
    {
      key: 'lifecycle',
      header: 'Lifecycle / value',
      render: (task) => {
        const contact = findContact(task.contactId);
        if (!contact) return '—';
        return (
          <span className="crm-queue__lifecycle">
            <span className="crm-queue__capitalize">{contact.stage}</span>
            <span className="crm-queue__dot" aria-hidden="true">
              ·
            </span>
            <span className="crm-queue__capitalize">{contact.salesTier}</span>
          </span>
        );
      },
    },
    {
      key: 'lastContact',
      header: 'Last contact',
      render: (task) => {
        const last = attemptsForContact(attempts, task.contactId)[0];
        const contact = findContact(task.contactId);
        const at = last?.startedAt ?? contact?.lastActivityAt;
        return <span className="crm-queue__muted">{at ? formatDate(at) : '—'}</span>;
      },
    },
    {
      key: 'status',
      header: 'Status / action',
      render: (task) => {
        const number = findCallingNumber(task.numberId);
        const capable = providerCapabilitiesFor(number).clickToCall;
        return (
          <div className="crm-queue__status">
            <TaskStatusBadge status={task.status} />
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Phone />}
              onClick={() => navigate(callHref(task))}
            >
              {capable ? 'Call' : 'Call manually'}
            </Button>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (task) => (
        <div className="crm-queue__actions">
          <IconButton
            label="Quick preview"
            icon={<Eye />}
            size="sm"
            onClick={() => {
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set('drawer', 'preview');
                next.set('taskId', task.id);
                return next;
              });
            }}
          />
          <IconButton
            label="WhatsApp"
            icon={<MessageSquare />}
            size="sm"
            onClick={() => navigate(inboxHandoffPath(task.contactId, { callTaskId: task.id }))}
          />
          <IconButton label="More actions" icon={<MoreHorizontal />} size="sm" onClick={() => setMenuTaskId(task.id)} />
        </div>
      ),
    },
  ];

  const ownerOptions = [
    { value: '', label: 'All assignees' },
    ...users.filter((u) => u.role !== 'owner').map((u) => ({ value: u.id, label: u.name })),
  ];
  const lifecycleOptions = [
    { value: '', label: 'All lifecycle stages' },
    { value: 'new', label: 'New' },
    { value: 'engaged', label: 'Engaged' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'customer', label: 'Customer' },
    { value: 'dormant', label: 'Dormant' },
  ];

  return (
    <div className="crm-queue">
      <PageHeader
        title="Call Queue"
        description="One queue, saved views. Compact rows keep the scan-and-call flow fast."
        toolbar={
          <div className="crm-queue__views">
            {savedQueueViews.map((view) => (
              <button
                key={view.id}
                type="button"
                className={`crm-queue__view${view.id === viewId ? ' crm-queue__view--active' : ''}${view.phase2 ? ' crm-queue__view--phase2' : ''}`}
                onClick={() => setView(view.id)}
                title={view.phase2 ? `${view.description} (disabled — Phase 2)` : view.description}
                aria-disabled={view.phase2}
              >
                {view.label}
                <span className="crm-queue__view-count">{viewCounts[view.id] ?? 0}</span>
              </button>
            ))}
          </div>
        }
      />

      {providerFailure ? <ProviderFailureBanner /> : !providerConnected ? <ProviderDisconnectedBanner /> : null}

      {activeView.phase2 ? (
        <EmptyState
          title="Callbacks is a Phase 2 view"
          description="Missed-call callback automation depends on inbound telephony events, which this prototype does not implement yet."
        />
      ) : (
        <>
          <div className="crm-queue__toolbar">
            <SearchField
              label="Search queue"
              placeholder="Search name, company, mobile…"
              width="300px"
              value={q}
              onChange={(e) => setParam('q', e.target.value)}
            />
            <Select
              label="Assignee"
              hideLabel
              size="sm"
              options={ownerOptions}
              value={assigneeFilter ?? ''}
              onChange={(e) => setParam('assigneeId', e.target.value)}
            />
            <Select
              label="Lifecycle"
              hideLabel
              size="sm"
              options={lifecycleOptions}
              value={lifecycleFilter ?? ''}
              onChange={(e) => setParam('lifecycle', e.target.value)}
            />
          </div>

          {selected.size > 0 && can(role, 'calling.bulk_assign') ? (
            <div className="crm-queue__bulkbar" role="region" aria-label="Bulk actions">
              <span>{selected.size} selected</span>
              <div className="crm-queue__bulkactions">
                <Button variant="ghost" size="sm" onClick={() => setAssignTaskIds([...selected])}>
                  Assign / Reassign
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setRescheduleTaskIds([...selected])}>
                  Reschedule
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                  Clear
                </Button>
              </div>
            </div>
          ) : null}

          {state === 'loading' ? (
            <LoadingSkeleton lines={8} />
          ) : (
            <>
              <DataTable
                caption="Call queue"
                columns={columns}
                rows={rows}
                rowKey={(t) => t.id}
                selectable={can(role, 'calling.bulk_assign')}
                selectedIds={selected}
                onToggleRow={toggleRow}
                onToggleAll={toggleAll}
                emptyState={
                  <EmptyState
                    title={q || assigneeFilter || lifecycleFilter ? 'No calls match these filters' : 'Queue is clear'}
                    description={
                      q || assigneeFilter || lifecycleFilter
                        ? 'Try widening the filters or switching saved views.'
                        : 'Nothing due in this view right now.'
                    }
                  />
                }
              />
              <p className="crm-queue__count">{rows.length} calls</p>
            </>
          )}
        </>
      )}

      <QuickPreviewDrawer
        open={drawerOpen}
        task={previewTask}
        attempts={attempts}
        onClose={() => {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete('drawer');
            next.delete('taskId');
            return next;
          });
        }}
        onOpenWorkspace={(taskId) => navigate(scopedHref(`/calling/task/${taskId}`))}
        onWhatsApp={(contactId) => navigate(inboxHandoffPath(contactId))}
        onViewProfile={(contactId) =>
          navigate(scopedHref(`/contacts/customer/${contactId}`, { returnTo: `/calling/queue?${searchParams.toString()}` }))
        }
      />

      <Popover open={!!menuTask} title={menuContact?.name ?? 'Actions'} onClose={() => setMenuTaskId(null)}>
        {menuTask && menuContact ? (
          <div className="crm-queue__menu">
            <Button
              variant="ghost"
              iconLeft={<UserIcon />}
              fullWidth
              onClick={() => {
                navigate(scopedHref(`/contacts/customer/${menuContact.id}`, { returnTo: `/calling/queue?${searchParams.toString()}` }));
                setMenuTaskId(null);
              }}
            >
              View contact
            </Button>
            {can(role, 'calling.assign') ? (
              <Button
                variant="ghost"
                fullWidth
                onClick={() => {
                  setAssignTaskIds([menuTask.id]);
                  setMenuTaskId(null);
                }}
              >
                Reassign
              </Button>
            ) : null}
            <Button
              variant="ghost"
              fullWidth
              onClick={() => {
                setRescheduleTaskIds([menuTask.id]);
                setMenuTaskId(null);
              }}
            >
              Reschedule
            </Button>
            <Button
              variant="ghost"
              fullWidth
              onClick={() => {
                navigate(scopedHref(`/calling/task/${menuTask.id}`, { drawer: 'outcome' }));
                setMenuTaskId(null);
              }}
            >
              Log outcome
            </Button>
          </div>
        ) : null}
      </Popover>

      <AssignmentModal
        open={!!assignTaskIds || modalOpen}
        onClose={() => {
          setAssignTaskIds(null);
          if (modalOpen) setParam('modal', null);
        }}
        taskIds={assignTaskIds ?? [...selected]}
        tasks={scoped}
        onAssign={(assignments) => {
          for (const [taskId, agentId] of Object.entries(assignments)) {
            bulkUpdateTasks([taskId], { assigneeId: agentId });
          }
          setSelected(new Set());
        }}
      />

      <RescheduleModal
        open={!!rescheduleTaskIds}
        onClose={() => setRescheduleTaskIds(null)}
        taskIds={rescheduleTaskIds ?? []}
        tasks={scoped}
        onReschedule={(taskIds, dueAt) => {
          bulkUpdateTasks(taskIds, { dueAt, status: 'scheduled' });
          setSelected(new Set());
        }}
      />
    </div>
  );
}

function formatDue(iso: string): string {
  const date = new Date(iso);
  const now = referenceNow();
  const sameDay = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today, ${time}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`;
  return `${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, ${time}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
