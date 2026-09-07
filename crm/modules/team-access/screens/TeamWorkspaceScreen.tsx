import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { findBranch, findTeam, findWhatsAppNumber } from '@crm/mock-data';
import { Badge, type Column, DataTable, EmptyState, ErrorState, KpiCard, Tabs } from '@crm/design-system';
import { AvailabilityBadge, EmploymentStatusBadge } from '../components';
import { auditEvents, findTeamRecord, teamMembers } from '../team-access-mock-data';
import { memberRoleLabel, rulesForTeam, teamWorkloadAggregate } from '../team-access-selectors';
import type { TeamMember } from '../team-access-types';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'members', label: 'Members' },
  { id: 'numbers', label: 'Numbers' },
  { id: 'workload', label: 'Workload' },
  { id: 'routing', label: 'Routing' },
  { id: 'activity', label: 'Activity' },
];

/** TEAM-S06 — Team Workspace: Overview/Members/Numbers/Workload/Routing/Activity. */
export default function TeamWorkspaceScreen() {
  const { teamId = '' } = useParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [searchParams, setSearchParams] = useSearchParams();

  const record = findTeamRecord(teamId);
  const team = findTeam(teamId);
  const activeTab = searchParams.get('tab') ?? 'overview';
  const setTab = (id: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', id);
      return next;
    });

  if (!record || !team) {
    return <ErrorState title="Team not found" description="This team may have been removed or the link is out of date." />;
  }

  const members = teamMembers.filter((m) => record.memberIds.includes(m.id));
  const workload = teamWorkloadAggregate(teamId);
  const rules = rulesForTeam(teamId);
  const events = auditEvents.filter((e) => e.branchId && record.branchIds.includes(e.branchId));

  const memberColumns: Column<TeamMember>[] = [
    { key: 'member', header: 'Member', render: (m) => m.name },
    { key: 'status', header: 'Status', render: (m) => <EmploymentStatusBadge status={m.employmentStatus} invite={m.inviteStatus} /> },
    { key: 'role', header: 'Role', render: (m) => memberRoleLabel(m) },
    { key: 'availability', header: 'Availability', render: (m) => <AvailabilityBadge availability={m.availability} /> },
  ];

  return (
    <div className="crm-team-workspace">
      <PageHeader
        title={team.name}
        description={`${record.crossBranch ? 'Cross-branch team' : 'Branch-scoped team'} · ${record.branchIds.map((id) => findBranch(id)?.name).join(', ')}`}
        breadcrumbs={[{ label: 'Structure', to: scopedHref('/team-access/structure', { view: 'teams' }) }, { label: team.name }]}
        toolbar={<Tabs tabs={tabs} activeId={activeTab} onChange={setTab} ariaLabel="Team workspace sections" />}
      />

      {activeTab === 'overview' ? (
        <div className="crm-team-workspace__panel">
          <div className="crm-team-workspace__grid">
            <KpiCard label="Members" value={members.length} />
            <KpiCard label="Lead" value={record.leadId ? teamMembers.find((m) => m.id === record.leadId)?.name ?? '—' : 'Unassigned'} />
            <KpiCard label="Numbers covered" value={record.numberIds.length} />
          </div>
          {record.numberIds.length === 0 ? (
            <Badge tone="danger">No WhatsApp number coverage — inbound work cannot reach this team</Badge>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'members' ? (
        members.length === 0 ? (
          <EmptyState title="No members yet" description="Add members from People, or invite directly into this team." />
        ) : (
          <DataTable
            caption="Team members"
            columns={memberColumns}
            rows={members}
            rowKey={(m) => m.id}
            onRowClick={(m) => navigate(scopedHref(`/team-access/people/${m.id}`))}
          />
        )
      ) : null}

      {activeTab === 'numbers' ? (
        <div className="crm-team-workspace__panel">
          {record.numberIds.length === 0 ? (
            <EmptyState title="No numbers assigned" description="Grant this team access from Structure → Numbers." />
          ) : (
            record.numberIds.map((id) => {
              const number = findWhatsAppNumber(id);
              return (
                <div key={id}>
                  {number ? `${number.displayName} — ${number.displayNumber} (${number.connectionStatus})` : id}
                </div>
              );
            })
          )}
        </div>
      ) : null}

      {activeTab === 'workload' ? (
        <div className="crm-team-workspace__panel">
          <div className="crm-team-workspace__grid">
            <KpiCard label="Open conversations" value={workload.openConversations} />
            <KpiCard label="Overdue" value={workload.overdueConversations} emphasis={workload.overdueConversations > 0 ? 'gold' : 'default'} />
            <KpiCard label="Members needing attention" value={workload.attentionCount} />
          </div>
        </div>
      ) : null}

      {activeTab === 'routing' ? (
        <div className="crm-team-workspace__panel">
          {rules.length === 0 ? (
            <EmptyState title="No assignment rules target this team" description="Configure routing in Settings → Assignment Rules." />
          ) : (
            rules.map((rule) => (
              <div key={rule.id}>
                <strong>{rule.name}</strong> — {rule.status} · {rule.strategy.replace(/_/g, ' ')}
                {rule.ownerFirst ? ' · owner-first' : ''}
              </div>
            ))
          )}
        </div>
      ) : null}

      {activeTab === 'activity' ? (
        <div className="crm-team-workspace__panel">
          {events.length === 0 ? (
            <EmptyState title="No recent activity" description="Access, assignment and membership changes for this team appear here." />
          ) : (
            events.map((e) => <div key={e.id}>{e.summary}</div>)
          )}
        </div>
      ) : null}
    </div>
  );
}
