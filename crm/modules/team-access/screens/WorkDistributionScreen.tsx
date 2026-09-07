import { CircleAlert, Clock } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { findTeam } from '@crm/mock-data';
import { Badge, Button, type Column, DataTable, EmptyState, Tabs } from '@crm/design-system';
import { AvailabilityBadge } from '../components';
import { can } from '../permissions';
import { simulateAssignmentRule } from '../resolvers';
import {
  assignmentRules,
  escalations,
  fallbackQueues,
  teamMembers,
  workloadSummaries,
} from '../team-access-mock-data';
import type { TeamMember, WorkloadSummary } from '../team-access-types';

const tabs = [
  { id: 'workload', label: 'Workload' },
  { id: 'routing', label: 'Routing' },
  { id: 'queues', label: 'Queues' },
  { id: 'escalations', label: 'Escalations' },
];

const reasonLabel: Record<string, string> = {
  sla_breach: 'SLA breach',
  urgent: 'Urgent',
  high_value: 'High value',
  complaint: 'Complaint',
  manual_handover: 'Manual handover',
};

/** TEAM-S11–S15 normalized — Work Distribution: Workload/Routing/Queues/Escalations. */
export default function WorkDistributionScreen() {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [searchParams, setSearchParams] = useSearchParams();
  const { role } = useWorkspace();

  const view = searchParams.get('view') ?? 'workload';
  const setView = (id: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('view', id);
      return next;
    });
  const state = searchParams.get('state');

  const activeMembers = teamMembers.filter((m) => m.employmentStatus === 'active');
  const rows = activeMembers
    .map((m) => ({ member: m, workload: workloadSummaries.find((w) => w.memberId === m.id) }))
    .filter((r): r is { member: TeamMember; workload: WorkloadSummary } => Boolean(r.workload))
    .filter((r) => (state === 'overload' ? r.workload.attention === 'overloaded' : true));

  const workloadColumns: Column<{ member: TeamMember; workload: WorkloadSummary }>[] = [
    { key: 'member', header: 'Member', render: (r) => r.member.name },
    { key: 'availability', header: 'Availability', render: (r) => <AvailabilityBadge availability={r.member.availability} /> },
    { key: 'open', header: 'Open conv.', render: (r) => String(r.workload.openConversations) },
    { key: 'overdue', header: 'Overdue', render: (r) => String(r.workload.overdueConversations) },
    { key: 'calls', header: 'Calls due/overdue', render: (r) => `${r.workload.callsDue} / ${r.workload.callsOverdue}` },
    { key: 'leads', header: 'Leads', render: (r) => String(r.workload.leadsOpen) },
    { key: 'tasks', header: 'Tasks', render: (r) => String(r.workload.tasksOpen) },
    { key: 'followups', header: 'Follow-ups', render: (r) => String(r.workload.followUpsOpen) },
    {
      key: 'attention',
      header: 'Attention',
      render: (r) =>
        r.workload.attention === 'none' ? (
          <Badge tone="success">Balanced</Badge>
        ) : r.workload.attention === 'overloaded' ? (
          <Badge tone="danger">Overloaded</Badge>
        ) : r.workload.attention === 'unavailable_with_work' ? (
          <Badge tone="warning">Unavailable, has work</Badge>
        ) : (
          <Badge tone="neutral">Underutilised</Badge>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => navigate(scopedHref('/team-access/work', { view: 'workload', drawer: 'availability', memberId: r.member.id }))}>
            Availability
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate(scopedHref('/team-access/work', { view: 'workload', modal: 'redistribute', memberIds: r.member.id }))}>
            Redistribute
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="crm-work">
      <PageHeader
        title="Work Distribution"
        description="Workload, automatic routing, fallback queues and escalations — one operational view of who is doing what."
        toolbar={<Tabs tabs={tabs} activeId={view} onChange={setView} ariaLabel="Work distribution sections" />}
      />

      {view === 'workload' ? (
        rows.length === 0 ? (
          <EmptyState title="No workload in scope" description={state === 'overload' ? 'No one is currently overloaded.' : undefined} />
        ) : (
          <DataTable caption="Workload by member" columns={workloadColumns} rows={rows} rowKey={(r) => r.member.id} />
        )
      ) : null}

      {view === 'routing' ? (
        <div className="crm-work">
          {assignmentRules.map((rule) => {
            const simulation = simulateAssignmentRule(rule);
            const noEligibleDestination = simulation.selectedMemberId === null;
            return (
              <div key={rule.id} className="crm-work-rule">
                <div className="crm-work-rule__head">
                  <strong>{rule.name}</strong>
                  <Badge tone={rule.status === 'active' ? 'success' : rule.status === 'draft' ? 'warning' : 'neutral'}>{rule.status}</Badge>
                  {noEligibleDestination ? <Badge tone="danger">No eligible destination</Badge> : null}
                </div>
                <span>Strategy: {rule.strategy.replace(/_/g, ' ')}{rule.ownerFirst ? ' · existing owner first' : ''}</span>
                <span>Eligible pool: {rule.eligibleTeamIds.length ? rule.eligibleTeamIds.map((id) => findTeam(id)?.name ?? id).join(', ') : rule.eligibleUserIds.length ? `${rule.eligibleUserIds.length} named users` : 'Not set'}</span>
                <span>Fallback: {rule.fallbackQueueId ? fallbackQueues.find((q) => q.id === rule.fallbackQueueId)?.name : <Badge tone="danger">No fallback configured</Badge>}</span>
                <span>Unmatched (7d): {rule.unmatchedLast7d}</span>
                {noEligibleDestination && (state === 'no-eligible-assignee' || rule.status === 'active') ? (
                  <span className="crm-work-rule__warning">
                    Every named user/team resolves to an empty or ineligible pool right now — new matches for this rule fall straight to fallback.
                  </span>
                ) : null}
                <div style={{ display: 'flex', gap: 8 }}>
                  {rule.unmatchedLast7d > 0 ? (
                    <Button variant="secondary" size="sm" onClick={() => navigate(scopedHref('/team-access/work', { view: 'routing', state: 'unmatched' }))}>
                      Review unmatched
                    </Button>
                  ) : null}
                  {can(role, 'manageAssignmentRules') ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => navigate('/settings/routing')}>
                        Edit in Settings
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/settings/routing?drawer=test&ruleId=${rule.id}`)}>
                        Test
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
          {state === 'unmatched' ? (
            <Badge tone="warning" icon={<CircleAlert size={12} />}>
              {assignmentRules.reduce((sum, r) => sum + r.unmatchedLast7d, 0)} records could not be matched to a rule in the last 7 days.
            </Badge>
          ) : null}
        </div>
      ) : null}

      {view === 'queues' ? (
        <div className="crm-work__cards">
          {fallbackQueues.map((queue) => (
            <div key={queue.id} className="crm-work-card">
              <span className="crm-work-card__title">{queue.name}</span>
              <span className="crm-work-card__row"><span>Scope</span><span>{queue.scope}</span></span>
              <span className="crm-work-card__row"><span>Waiting</span><span>{queue.waiting}</span></span>
              <span className="crm-work-card__row"><span>Oldest wait</span><span>{queue.oldestWaitMinutes}m</span></span>
              <span className="crm-work-card__row">
                <span>SLA</span>
                <Badge tone={queue.slaRisk === 'breach' ? 'danger' : queue.slaRisk === 'watch' ? 'warning' : 'success'}>
                  {queue.slaRisk === 'none' ? 'On track' : queue.slaRisk === 'watch' ? 'At risk' : 'Breached'}
                </Badge>
              </span>
              <Button variant="secondary" size="sm" onClick={() => navigate(`/inbox?queue=${queue.id}&sourceModule=team-access&returnTo=/team-access/work`)}>
                Open in Inbox
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {view === 'escalations' ? (
        escalations.length === 0 ? (
          <EmptyState title="No pending escalations" />
        ) : (
          <div className="crm-work">
            {escalations.map((esc) => (
              <div key={esc.id} className="crm-work-escalation">
                <div className="crm-work-escalation__row">
                  <strong>{esc.contactName}</strong>
                  <Badge tone={esc.reason === 'sla_breach' || esc.reason === 'complaint' ? 'danger' : 'warning'} icon={<Clock size={12} />}>
                    {reasonLabel[esc.reason]}
                  </Badge>
                </div>
                <span>
                  Owner: {esc.currentOwnerId ? teamMembers.find((m) => m.id === esc.currentOwnerId)?.name : 'Unowned'} · Assignee:{' '}
                  {esc.currentAssigneeId ? teamMembers.find((m) => m.id === esc.currentAssigneeId)?.name : 'Unassigned'}
                </span>
                <span>{esc.slaMinutesRemaining !== null && esc.slaMinutesRemaining < 0 ? `SLA breached ${Math.abs(esc.slaMinutesRemaining)}m ago` : esc.slaMinutesRemaining !== null ? `${esc.slaMinutesRemaining}m to SLA` : 'No SLA tracked'}</span>
                <span>Handover note: {esc.handoverNoteComplete ? 'Complete' : <Badge tone="warning">Missing</Badge>}</span>
                <div className="crm-work-escalation__actions">
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/inbox?escalationId=${esc.id}&sourceModule=team-access&returnTo=/team-access/work`)}>
                    Open conversation
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => navigate(scopedHref('/team-access/work', { view: 'escalations', modal: 'transfer', issue: esc.id }))}>
                    Reassign
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
