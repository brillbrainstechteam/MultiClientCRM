import { PlugZap } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { branches, findBranch, findTeam } from '@crm/mock-data';
import { Badge, type Column, DataTable, EmptyState, StatusBadge, Tabs } from '@crm/design-system';
import { branchRecords, isMultiBranch, teamMembers, teamRecords, whatsappNumbers } from '../team-access-mock-data';
import {
  accessGrantsForNumber,
  branchUserCount,
  branchWorkloadAttentionCount,
  teamActiveMemberCount,
  teamWorkloadAggregate,
} from '../team-access-selectors';
import type { BranchRecord, TeamRecord } from '../team-access-types';

const connectionTone = { connected: 'success', degraded: 'warning', disconnected: 'danger' } as const;
const qualityLabel = { high: 'High quality', medium: 'Medium quality', low: 'Low quality', unrated: 'Unrated' } as const;

/** TEAM-S05–S10 normalized — Structure: Teams / Branches / Numbers tabs (SPEC §7). */
export default function StructureScreen() {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs = [
    { id: 'teams', label: 'Teams' },
    ...(isMultiBranch ? [{ id: 'branches', label: 'Branches' }] : []),
    { id: 'numbers', label: 'Numbers' },
  ];
  const view = searchParams.get('view') ?? 'teams';
  const activeView = view === 'branches' && !isMultiBranch ? 'teams' : view;
  const setView = (id: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('view', id);
      return next;
    });

  const teamColumns: Column<TeamRecord>[] = [
    { key: 'team', header: 'Team', render: (t) => teamName(t.id) },
    { key: 'lead', header: 'Lead', render: (t) => (t.leadId ? teamMemberName(t.leadId) : 'Unassigned') },
    { key: 'branch', header: 'Branch', render: (t) => t.branchIds.map((id) => findBranch(id)?.name ?? id).join(', ') + (t.crossBranch ? ' (cross-branch)' : '') },
    { key: 'members', header: 'Members', render: (t) => String(teamActiveMemberCount(t.id)) },
    {
      key: 'workload',
      header: 'Workload',
      render: (t) => {
        const agg = teamWorkloadAggregate(t.id);
        return `${agg.openConversations} open${agg.overdueConversations ? ` · ${agg.overdueConversations} overdue` : ''}`;
      },
    },
    { key: 'numbers', header: 'Number coverage', render: (t) => (t.numberIds.length ? t.numberIds.length : 'None — no coverage') },
    {
      key: 'health',
      header: 'Queue health',
      render: (t) => {
        const agg = teamWorkloadAggregate(t.id);
        if (t.numberIds.length === 0) return <Badge tone="danger">No coverage</Badge>;
        return agg.attentionCount > 0 ? <Badge tone="warning">Needs attention</Badge> : <Badge tone="success">Healthy</Badge>;
      },
    },
  ];

  const branchColumns: Column<BranchRecord>[] = [
    { key: 'branch', header: 'Branch', render: (b) => findBranch(b.id)?.name ?? b.id },
    { key: 'managers', header: 'Manager(s)', render: (b) => (b.managerIds.length ? b.managerIds.map(teamMemberName).join(', ') : 'Unassigned') },
    { key: 'teams', header: 'Teams', render: (b) => String(b.teamIds.length) },
    { key: 'users', header: 'Users', render: (b) => String(branchUserCount(b.id)) },
    { key: 'numbers', header: 'Number coverage', render: (b) => String(b.numberIds.length) },
    {
      key: 'attention',
      header: 'Workload flags',
      render: (b) => {
        const count = branchWorkloadAttentionCount(b.id);
        return count > 0 ? <Badge tone="warning">{count} flagged</Badge> : <Badge tone="success">None</Badge>;
      },
    },
  ];

  return (
    <div className="crm-team-structure">
      <PageHeader
        title="Structure"
        description="How the organisation is shaped and which WhatsApp numbers each part covers."
        toolbar={<Tabs tabs={tabs} activeId={activeView} onChange={setView} ariaLabel="Structure sections" />}
      />

      {activeView === 'teams' ? (
        <DataTable
          caption="Teams"
          columns={teamColumns}
          rows={teamRecords}
          rowKey={(t) => t.id}
          onRowClick={(t) => navigate(scopedHref(`/team-access/teams/${t.id}`))}
        />
      ) : null}

      {activeView === 'branches' && isMultiBranch ? (
        <DataTable
          caption="Branches"
          columns={branchColumns}
          rows={branchRecords}
          rowKey={(b) => b.id}
          onRowClick={(b) => navigate(scopedHref(`/team-access/branches/${b.id}`))}
        />
      ) : null}

      {activeView === 'numbers' ? (
        whatsappNumbers.length === 0 ? (
          <EmptyState title="No WhatsApp numbers connected" description="Connect a number in Settings to grant Team & Access." />
        ) : (
          <div className="crm-team-numbers">
            {whatsappNumbers.map((number) => {
              const grants = accessGrantsForNumber(number.id);
              const defaultGrant = grants.find((g) => g.isDefault);
              return (
                <div key={number.id} className="crm-team-number-card">
                  <div className="crm-team-number-card__head">
                    <div>
                      <div className="crm-team-number-card__title">{number.displayName}</div>
                      <div className="crm-team-number-card__meta">{number.displayNumber} · {branches.find((b) => b.id === number.branchId)?.name} · {number.department}</div>
                    </div>
                    <StatusBadge tone={connectionTone[number.connectionStatus]}>{number.connectionStatus}</StatusBadge>
                  </div>
                  <div className="crm-team-number-card__row"><span>Quality</span><span>{qualityLabel[number.qualityRating]}</span></div>
                  <div className="crm-team-number-card__row"><span>Messaging limit</span><span>{number.messagingLimit}</span></div>
                  <div className="crm-team-number-card__row"><span>Assigned access</span><span>{grants.length} grant{grants.length === 1 ? '' : 's'}</span></div>
                  <div className="crm-team-number-card__row"><span>Effective default</span><span>{defaultGrant ? subjectLabel(defaultGrant.subjectType, defaultGrant.subjectId) : 'Not set'}</span></div>
                  {number.connectionStatus === 'disconnected' ? (
                    <Badge tone="warning" icon={<PlugZap size={12} />}>Sending/receiving disabled until reconnected in Settings</Badge>
                  ) : null}
                  <a
                    className="crm-team-number-card__row"
                    style={{ color: 'var(--crm-text-brand)', cursor: 'pointer' }}
                    onClick={() =>
                      navigate(scopedHref('/team-access/structure', { view: 'numbers', drawer: 'access', numberId: number.id }))
                    }
                  >
                    Manage access →
                  </a>
                </div>
              );
            })}
          </div>
        )
      ) : null}
    </div>
  );
}

function teamName(teamId: string): string {
  return findTeam(teamId)?.name ?? teamId;
}

function teamMemberName(memberId: string): string {
  return teamMembers.find((m) => m.id === memberId)?.name ?? memberId;
}

function subjectLabel(type: 'user' | 'team' | 'branch', id: string): string {
  if (type === 'user') return teamMemberName(id);
  if (type === 'team') return teamName(id);
  return findBranch(id)?.name ?? id;
}
