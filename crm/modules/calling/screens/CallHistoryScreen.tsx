import { Eye, MessageSquare } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import {
  DataTable,
  EmptyState,
  IconButton,
  SearchField,
  Select,
  type Column,
} from '@crm/design-system';
import { findContact, findUser, users } from '@crm/mock-data';
import { useCallingData } from '../calling-data-context';
import { CallChannelBadge, CallRecordDrawer, ConnectionStatusBadge, ContactCell, DispositionBadge } from '../components';
import { findCallingNumber } from '../data';
import { applyBranchScope, attemptsVisibleToRole, filterHistory } from '../calling-selectors';
import { connectionStatusLabel, dispositionLabel } from '../calling-labels';
import type { CallAttempt } from '../domain';
import { inboxHandoffPath } from '../inbox-handoff';
import { can } from '../permissions';

/** CALL-S06 — Call History: searchable, filterable log of every call attempt. */
export default function CallHistoryScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role, currentUser, branchId } = useWorkspace();
  const { tasks, attempts } = useCallingData();

  const q = searchParams.get('q') ?? '';
  const agentFilter = searchParams.get('agentId');
  const connectionFilter = searchParams.get('connection');
  const dispositionFilter = searchParams.get('disposition');
  const recordAttemptId = searchParams.get('attemptId');
  const drawerOpen = searchParams.get('drawer') === 'record' && !!recordAttemptId;

  const setParam = (key: string, value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
      return next;
    });
  };

  const branchScopedTasks = applyBranchScope(tasks, branchId === 'all' ? null : branchId);
  const branchTaskIds = new Set(branchScopedTasks.map((t) => t.id));
  const branchScopedAttempts =
    branchId === 'all' ? attempts : attempts.filter((a) => branchTaskIds.has(a.taskId));

  const scoped = attemptsVisibleToRole(branchScopedAttempts, tasks, currentUser, role);
  let rows = filterHistory(scoped, {
    agentId: agentFilter,
    connectionStatus: connectionFilter,
    disposition: dispositionFilter,
    q,
  });
  rows = [...rows].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const recordAttempt = recordAttemptId ? attempts.find((a) => a.id === recordAttemptId) : undefined;
  const recordTask = recordAttempt ? tasks.find((t) => t.id === recordAttempt.taskId) : undefined;

  const openRecord = (attemptId: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('drawer', 'record');
      next.set('attemptId', attemptId);
      return next;
    });
  };

  const closeRecord = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('drawer');
      next.delete('attemptId');
      return next;
    });
  };

  const agentOptions = [
    { value: '', label: 'All agents' },
    ...users.filter((u) => u.role !== 'owner').map((u) => ({ value: u.id, label: u.name })),
  ];
  const connectionOptions = [
    { value: '', label: 'All connection outcomes' },
    ...Object.entries(connectionStatusLabel).map(([value, label]) => ({ value, label })),
  ];
  const dispositionOptions = [
    { value: '', label: 'All statuses' },
    ...Object.entries(dispositionLabel).map(([value, label]) => ({ value, label })),
  ];

  const columns: Column<CallAttempt>[] = [
    {
      key: 'customer',
      header: 'Customer',
      width: '22%',
      render: (attempt) => {
        const contact = findContact(attempt.contactId);
        return contact ? (
          <ContactCell contact={contact} to={scopedHref(`/contacts/customer/${contact.id}`, { returnTo: '/calling/history' })} />
        ) : (
          attempt.contactId
        );
      },
    },
    {
      key: 'when',
      header: 'Date / time',
      render: (attempt) => <span className="crm-history__muted">{formatDateTime(attempt.startedAt)}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (attempt) => {
        const task = tasks.find((t) => t.id === attempt.taskId);
        const number = task ? findCallingNumber(task.numberId) : undefined;
        return number ? <CallChannelBadge channel={number.channel} /> : <span className="crm-history__muted">—</span>;
      },
    },
    {
      key: 'connection',
      header: 'Connection',
      render: (attempt) => <ConnectionStatusBadge status={attempt.connectionStatus} />,
    },
    {
      key: 'disposition',
      header: 'Status',
      render: (attempt) => (attempt.disposition ? <DispositionBadge disposition={attempt.disposition} /> : <span className="crm-history__muted">—</span>),
    },
    {
      key: 'agent',
      header: 'Agent',
      render: (attempt) => {
        const agent = findUser(attempt.agentId);
        return agent ? agent.name : attempt.agentId;
      },
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (attempt) => (attempt.durationSeconds !== null ? formatDuration(attempt.durationSeconds) : '—'),
    },
    {
      key: 'mode',
      header: 'Mode',
      render: (attempt) => (attempt.mode === 'manual' ? 'Manual' : 'Provider'),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (attempt) => (
        <div className="crm-history__actions">
          <IconButton label="View call record" icon={<Eye />} size="sm" onClick={() => openRecord(attempt.id)} />
          <IconButton
            label="WhatsApp"
            icon={<MessageSquare />}
            size="sm"
            onClick={() => navigate(inboxHandoffPath(attempt.contactId))}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="crm-history">
      <PageHeader
        title="Call History"
        description="Every logged call attempt, searchable and filterable — the source record behind each outcome."
      />

      <div className="crm-history__toolbar">
        <SearchField
          label="Search history"
          placeholder="Search by customer name…"
          width="280px"
          value={q}
          onChange={(e) => setParam('q', e.target.value)}
        />
        {can(role, 'calling.view_team') ? (
          <Select label="Agent" hideLabel size="sm" options={agentOptions} value={agentFilter ?? ''} onChange={(e) => setParam('agentId', e.target.value)} />
        ) : null}
        <Select
          label="Connection"
          hideLabel
          size="sm"
          options={connectionOptions}
          value={connectionFilter ?? ''}
          onChange={(e) => setParam('connection', e.target.value)}
        />
        <Select
          label="Status"
          hideLabel
          size="sm"
          options={dispositionOptions}
          value={dispositionFilter ?? ''}
          onChange={(e) => setParam('disposition', e.target.value)}
        />
      </div>

      <DataTable
        caption="Call history"
        columns={columns}
        rows={rows}
        rowKey={(a) => a.id}
        emptyState={
          <EmptyState
            title={q || agentFilter || connectionFilter || dispositionFilter ? 'No calls match these filters' : 'No calls logged yet'}
            description={
              q || agentFilter || connectionFilter || dispositionFilter
                ? 'Try widening the filters.'
                : 'Call attempts appear here as soon as outcomes are logged from the Queue or Call Workspace.'
            }
          />
        }
      />
      <p className="crm-history__count">{rows.length} calls</p>

      <CallRecordDrawer
        open={drawerOpen}
        attempt={recordAttempt}
        task={recordTask}
        onClose={closeRecord}
        onWhatsApp={(contactId) => navigate(inboxHandoffPath(contactId))}
        onViewProfile={(contactId) =>
          navigate(scopedHref(`/contacts/customer/${contactId}`, { returnTo: `/calling/history?${searchParams.toString()}` }))
        }
        onViewTask={(taskId) => navigate(scopedHref(`/calling/task/${taskId}`))}
      />
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' });
}
