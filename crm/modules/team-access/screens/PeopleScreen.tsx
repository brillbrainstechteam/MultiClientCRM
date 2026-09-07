import { UserRoundPlus, UserRoundX, RotateCcw, Mail, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { branches, teams } from '@crm/mock-data';
import {
  Button,
  ConfirmDialog,
  type Column,
  DataTable,
  EmptyState,
  IconButton,
  PermissionRestricted,
  SearchField,
  Select,
  Toast,
} from '@crm/design-system';
import { AvailabilityBadge, EmploymentStatusBadge } from '../components';
import { can } from '../permissions';
import { findWorkload, roles } from '../team-access-mock-data';
import {
  filterMembers,
  memberBranchLabel,
  memberLastActivityLabel,
  memberNumberCue,
  memberRoleLabel,
  memberTeamLabel,
} from '../team-access-selectors';
import type { TeamMember } from '../team-access-types';

type RowAction = { type: 'reactivate' | 'resend' | 'cancel'; member: TeamMember };

/** TEAM-S02 — People directory. Compact operational columns, not an HR spreadsheet (SPEC §4). */
export default function PeopleScreen() {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [searchParams, setSearchParams] = useSearchParams();
  const { role, isMultiBranchDisplay } = usePeopleWorkspace();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingAction, setPendingAction] = useState<RowAction | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const view = searchParams.get('view'); // active | pending | inactive
  const branchFilter = searchParams.get('branch');
  const teamFilter = searchParams.get('team');
  const roleFilter = searchParams.get('role_id');
  const numberFilter = searchParams.get('number');
  const forcedState = searchParams.get('state');

  const setFilter = (key: string, value: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });

  const members = useMemo(
    () =>
      filterMembers({
        search,
        status: view === 'active' || view === 'pending' || view === 'inactive' ? view : null,
        branchId: branchFilter,
        teamId: teamFilter,
        roleId: roleFilter,
        numberId: numberFilter,
      }),
    [search, view, branchFilter, teamFilter, roleFilter, numberFilter],
  );

  const showNoResults = forcedState === 'no-results' || (members.length === 0 && (search || view || branchFilter || teamFilter || roleFilter || numberFilter));

  const columns: Column<TeamMember>[] = [
    {
      key: 'member',
      header: 'Member',
      render: (m) => (
        <div className="crm-team-people__member">
          <div className="crm-team-people__member-text">
            <span className="crm-team-people__member-name">{m.name}</span>
            <span className="crm-team-people__member-title">{m.title}</span>
          </div>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (m) => <EmploymentStatusBadge status={m.employmentStatus} invite={m.inviteStatus} /> },
    { key: 'role', header: 'Role', render: (m) => memberRoleLabel(m) },
    { key: 'team', header: 'Team', render: (m) => memberTeamLabel(m) },
    ...(isMultiBranchDisplay
      ? [{ key: 'branch', header: 'Branch', render: (m: TeamMember) => memberBranchLabel(m) } as Column<TeamMember>]
      : []),
    { key: 'availability', header: 'Availability', render: (m) => <AvailabilityBadge availability={m.availability} /> },
    {
      key: 'workload',
      header: 'Workload',
      render: (m) => {
        const workload = findWorkload(m.id);
        if (!workload) return '—';
        return `${workload.openConversations} open${workload.overdueConversations ? ` · ${workload.overdueConversations} overdue` : ''}`;
      },
    },
    { key: 'number', header: 'Number access', render: (m) => memberNumberCue(m) },
    { key: 'activity', header: 'Last activity / invite', render: (m) => memberLastActivityLabel(m) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (m) => (
        <div className="crm-team-people__row-actions" onClick={(e) => e.stopPropagation()}>
          {m.employmentStatus === 'inactive' ? (
            <IconButton label="Reactivate" icon={<RotateCcw />} size="sm" onClick={() => setPendingAction({ type: 'reactivate', member: m })} />
          ) : null}
          {m.employmentStatus === 'pending' ? (
            <>
              <IconButton label="Resend invite" icon={<Mail />} size="sm" onClick={() => setPendingAction({ type: 'resend', member: m })} />
              <IconButton label="Cancel invite" icon={<X />} size="sm" onClick={() => setPendingAction({ type: 'cancel', member: m })} />
            </>
          ) : null}
          {m.employmentStatus === 'active' ? (
            <IconButton
              label="Start exit"
              icon={<UserRoundX />}
              size="sm"
              onClick={() => navigate(scopedHref(`/team-access/people/${m.id}`, { wizard: 'exit', step: 'block', memberId: m.id }))}
            />
          ) : null}
        </div>
      ),
    },
  ];

  const branchOptions = [{ value: '', label: 'All branches' }, ...branches.map((b) => ({ value: b.id, label: b.name }))];
  const teamOptions = [{ value: '', label: 'All teams' }, ...teams.map((t) => ({ value: t.id, label: t.name }))];
  const roleOptions = [{ value: '', label: 'All roles' }, ...roles.map((r) => ({ value: r.id, label: r.name }))];
  const statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
    { value: 'inactive', label: 'Inactive' },
  ];

  const confirmCopy: Record<RowAction['type'], { title: string; message: string; confirmLabel: string; successMessage: (name: string) => string }> = {
    reactivate: {
      title: 'Reactivate member?',
      message: 'This restores their access review — role, number access and team membership must be re-confirmed on their profile.',
      confirmLabel: 'Reactivate',
      successMessage: (name) => `${name} marked ready for reactivation review.`,
    },
    resend: {
      title: 'Resend invitation?',
      message: 'A new invitation link will be sent to the same email address.',
      confirmLabel: 'Resend invite',
      successMessage: (name) => `Invitation resent to ${name}.`,
    },
    cancel: {
      title: 'Cancel invitation?',
      message: 'This withdraws the pending invitation. The seat is released immediately.',
      confirmLabel: 'Cancel invitation',
      successMessage: (name) => `Invitation to ${name} cancelled.`,
    },
  };

  if (!can(role, 'viewPeople')) {
    return (
      <PermissionRestricted
        title="People isn't available for your role"
        description="Ask a workspace owner or manager for access."
      />
    );
  }

  return (
    <div className="crm-team-people">
      <PageHeader
        title="People"
        description="Every member of the workspace with status, role, scope, availability and workload at a glance."
        actions={
          <Button
            variant="primary"
            iconLeft={<UserRoundPlus />}
            onClick={() => navigate(scopedHref('/team-access/people', { drawer: 'invite', step: 'identity' }))}
          >
            Invite team member
          </Button>
        }
        toolbar={
          <div className="crm-team-people__toolbar">
            <SearchField
              label="Search people"
              width="260px"
              className="crm-team-people__toolbar-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or title"
            />
            <Select label="Status" hideLabel size="sm" options={statusOptions} value={view ?? ''} onChange={(e) => setFilter('view', e.target.value)} />
            {isMultiBranchDisplay ? (
              <Select label="Branch" hideLabel size="sm" options={branchOptions} value={branchFilter ?? ''} onChange={(e) => setFilter('branch', e.target.value)} />
            ) : null}
            <Select label="Team" hideLabel size="sm" options={teamOptions} value={teamFilter ?? ''} onChange={(e) => setFilter('team', e.target.value)} />
            <Select label="Role" hideLabel size="sm" options={roleOptions} value={roleFilter ?? ''} onChange={(e) => setFilter('role_id', e.target.value)} />
          </div>
        }
      />

      {selected.size > 0 ? (
        <div className="crm-team-people__bulk">
          <span>{selected.size} selected</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                navigate(scopedHref('/team-access/work', { view: 'workload', modal: 'redistribute', memberIds: Array.from(selected).join(',') }))
              }
            >
              Transfer selected work
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      {showNoResults ? (
        <EmptyState
          title="No members match these filters"
          description="Try clearing a filter or searching a different name or email."
          actions={
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setSearchParams(new URLSearchParams());
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <DataTable
          caption="Team members"
          columns={columns}
          rows={members}
          rowKey={(m) => m.id}
          selectable
          selectedIds={selected}
          onToggleRow={(id) =>
            setSelected((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
          onToggleAll={() =>
            setSelected((prev) => (prev.size === members.length ? new Set() : new Set(members.map((m) => m.id))))
          }
          onRowClick={(m) => navigate(scopedHref(`/team-access/people/${m.id}`))}
        />
      )}

      {pendingAction ? (
        <ConfirmDialog
          open
          title={confirmCopy[pendingAction.type].title}
          message={`${confirmCopy[pendingAction.type].message} (${pendingAction.member.name})`}
          confirmLabel={confirmCopy[pendingAction.type].confirmLabel}
          onCancel={() => setPendingAction(null)}
          onConfirm={() => {
            setToast(confirmCopy[pendingAction.type].successMessage(pendingAction.member.name));
            setPendingAction(null);
          }}
        />
      ) : null}

      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}

/** Small helper so the multi-branch conditional nav rule (SPEC §7) reads in one place. */
function usePeopleWorkspace() {
  const { role, availableBranches } = useWorkspace();
  return { role, isMultiBranchDisplay: availableBranches.length > 1 };
}
