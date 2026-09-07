import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { findBranch, findTeam, findWhatsAppNumber } from '@crm/mock-data';
import { Badge, type Column, DataTable, EmptyState, ErrorState, KpiCard, Tabs } from '@crm/design-system';
import { AvailabilityBadge, EmploymentStatusBadge } from '../components';
import { auditEvents, findBranchRecord, teamMembers, teamRecords } from '../team-access-mock-data';
import { branchUserCount, branchWorkloadAttentionCount, memberRoleLabel } from '../team-access-selectors';
import type { TeamMember } from '../team-access-types';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'teams', label: 'Teams' },
  { id: 'numbers', label: 'Numbers' },
  { id: 'access', label: 'Access boundary' },
  { id: 'work-health', label: 'Work health' },
  { id: 'activity', label: 'Activity' },
];

/** TEAM-S08 — Branch Detail (multi-branch tenants only). */
export default function BranchDetailScreen() {
  const { branchId = '' } = useParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [searchParams, setSearchParams] = useSearchParams();

  const record = findBranchRecord(branchId);
  const branch = findBranch(branchId);
  const activeTab = searchParams.get('tab') ?? 'overview';
  const setTab = (id: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', id);
      return next;
    });

  if (!record || !branch) {
    return <ErrorState title="Branch not found" description="This branch may have been removed or the link is out of date." />;
  }

  const users = teamMembers.filter((m) => m.branchIds.includes(branchId));
  const branchTeams = teamRecords.filter((t) => record.teamIds.includes(t.id));
  const events = auditEvents.filter((e) => e.branchId === branchId);

  const userColumns: Column<TeamMember>[] = [
    { key: 'member', header: 'Member', render: (m) => m.name },
    { key: 'status', header: 'Status', render: (m) => <EmploymentStatusBadge status={m.employmentStatus} invite={m.inviteStatus} /> },
    { key: 'role', header: 'Role', render: (m) => memberRoleLabel(m) },
    { key: 'availability', header: 'Availability', render: (m) => <AvailabilityBadge availability={m.availability} /> },
  ];

  return (
    <div className="crm-team-workspace">
      <PageHeader
        title={branch.name}
        description={branch.city}
        breadcrumbs={[{ label: 'Structure', to: scopedHref('/team-access/structure', { view: 'branches' }) }, { label: branch.name }]}
        toolbar={<Tabs tabs={tabs} activeId={activeTab} onChange={setTab} ariaLabel="Branch detail sections" />}
      />

      {activeTab === 'overview' ? (
        <div className="crm-team-workspace__panel">
          <div className="crm-team-workspace__grid">
            <KpiCard label="Teams" value={record.teamIds.length} />
            <KpiCard label="Users" value={branchUserCount(branchId)} />
            <KpiCard label="Numbers" value={record.numberIds.length} />
          </div>
          <div>
            <strong>Managers: </strong>
            {record.managerIds.length ? record.managerIds.map((id) => teamMembers.find((m) => m.id === id)?.name ?? id).join(', ') : 'Unassigned'}
          </div>
          <DataTable caption="Branch roster" columns={userColumns} rows={users} rowKey={(m) => m.id} onRowClick={(m) => navigate(scopedHref(`/team-access/people/${m.id}`))} />
        </div>
      ) : null}

      {activeTab === 'teams' ? (
        branchTeams.length === 0 ? (
          <EmptyState title="No teams in this branch yet" />
        ) : (
          <div className="crm-team-workspace__panel">
            {branchTeams.map((t) => (
              <div key={t.id}>
                <a style={{ color: 'var(--crm-text-brand)', cursor: 'pointer' }} onClick={() => navigate(scopedHref(`/team-access/teams/${t.id}`))}>
                  {findTeam(t.id)?.name ?? t.id}
                </a>
              </div>
            ))}
          </div>
        )
      ) : null}

      {activeTab === 'numbers' ? (
        <div className="crm-team-workspace__panel">
          {record.numberIds.map((id) => {
            const number = findWhatsAppNumber(id);
            return <div key={id}>{number ? `${number.displayName} — ${number.connectionStatus}` : id}</div>;
          })}
        </div>
      ) : null}

      {activeTab === 'access' ? (
        <div className="crm-team-workspace__panel">
          <p>Users, teams and numbers scoped to this branch cannot see or act on other branches&rsquo; records by default.</p>
          <Badge tone="neutral">Cross-branch teams: OFF unless explicitly designated central</Badge>
        </div>
      ) : null}

      {activeTab === 'work-health' ? (
        <div className="crm-team-workspace__panel">
          <KpiCard label="Members needing attention" value={branchWorkloadAttentionCount(branchId)} />
        </div>
      ) : null}

      {activeTab === 'activity' ? (
        events.length === 0 ? (
          <EmptyState title="No recent activity for this branch" />
        ) : (
          <div className="crm-team-workspace__panel">
            {events.map((e) => <div key={e.id}>{e.summary}</div>)}
          </div>
        )
      ) : null}
    </div>
  );
}
