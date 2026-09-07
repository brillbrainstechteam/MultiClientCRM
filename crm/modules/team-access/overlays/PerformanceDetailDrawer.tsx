import { useNavigate, useSearchParams } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Badge, Button, Drawer, EmptyState } from '@crm/design-system';
import { findPerformance, findTeamRecord, findWorkload, performanceSnapshots, teamMembers } from '../team-access-mock-data';
import { memberTeamLabel } from '../team-access-selectors';

/** TEAM-S17 — Performance Detail. Drawer/detail state, not a separate destination (SIMPLIFICATION_DECISIONS.md §5). Subject may be a member or a team. */
export function PerformanceDetailDrawer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const open = searchParams.get('drawer') === 'detail' && Boolean(searchParams.get('subject'));
  const subjectId = searchParams.get('subject') ?? '';

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['drawer', 'subject']) next.delete(key);
      return next;
    });

  if (!open) return null;

  const member = teamMembers.find((m) => m.id === subjectId);
  const team = !member ? findTeamRecord(subjectId) : undefined;
  if (!member && !team) return null;

  if (team) {
    const teamMemberRecords = teamMembers.filter((m) => team.memberIds.includes(m.id) && m.employmentStatus === 'active');
    const snapshots = teamMemberRecords.map((m) => performanceSnapshots.find((p) => p.memberId === m.id)).filter((s): s is NonNullable<typeof s> => Boolean(s?.dataAvailable));
    const totals = snapshots.reduce(
      (acc, s) => ({ assigned: acc.assigned + s.assigned, replied: acc.replied + s.replied, resolved: acc.resolved + s.resolved, overdue: acc.overdue + s.overdue, callsHandled: acc.callsHandled + s.callsHandled }),
      { assigned: 0, replied: 0, resolved: 0, overdue: 0, callsHandled: 0 },
    );

    return (
      <Drawer open title={team.id} subtitle={`${teamMemberRecords.length} active member(s)`} onClose={close} footer={<Button variant="secondary" onClick={close}>Close</Button>}>
        {snapshots.length === 0 ? (
          <EmptyState title="Not available" description="No member on this team has enough history yet for performance figures." />
        ) : (
          <div className="crm-perf-detail">
            <div className="crm-perf-detail__row"><span>Assigned</span><span>{totals.assigned}</span></div>
            <div className="crm-perf-detail__row"><span>Replied</span><span>{totals.replied}</span></div>
            <div className="crm-perf-detail__row"><span>Resolved</span><span>{totals.resolved}</span></div>
            <div className="crm-perf-detail__row"><span>Overdue</span><span>{totals.overdue > 0 ? <Badge tone="warning">{totals.overdue}</Badge> : '0'}</span></div>
            <div className="crm-perf-detail__row"><span>Calls handled</span><span>{totals.callsHandled}</span></div>
            <div className="crm-perf-detail__row"><span>Members without data yet</span><span>{teamMemberRecords.length - snapshots.length}</span></div>
          </div>
        )}
      </Drawer>
    );
  }

  const snapshot = findPerformance(member!.id);
  const workload = findWorkload(member!.id);

  return (
    <Drawer
      open
      title={member!.name}
      subtitle={memberTeamLabel(member!)}
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>Close</Button>
          <Button variant="primary" onClick={() => { close(); navigate(scopedHref(`/team-access/people/${member!.id}`)); }}>
            Open profile
          </Button>
        </>
      }
    >
      {!snapshot || !snapshot.dataAvailable ? (
        <EmptyState title="Not available" description="Not enough history yet for this person to show performance figures." />
      ) : (
        <div className="crm-perf-detail">
          <div className="crm-perf-detail__row"><span>Assigned</span><span>{snapshot.assigned}</span></div>
          <div className="crm-perf-detail__row"><span>Replied</span><span>{snapshot.replied}</span></div>
          <div className="crm-perf-detail__row"><span>Resolved</span><span>{snapshot.resolved}</span></div>
          <div className="crm-perf-detail__row">
            <span>Overdue</span>
            <span>{snapshot.overdue > 0 ? <Badge tone="warning">{snapshot.overdue}</Badge> : '0'}</span>
          </div>
          <div className="crm-perf-detail__row"><span>First response</span><span>{snapshot.firstResponseMinutes !== null ? `${snapshot.firstResponseMinutes}m` : 'Not available'}</span></div>
          <div className="crm-perf-detail__row"><span>Resolution time</span><span>{snapshot.resolutionHours !== null ? `${snapshot.resolutionHours}h` : 'Not available'}</span></div>
          <div className="crm-perf-detail__row"><span>Follow-up completion</span><span>{snapshot.followUpCompletionRate !== null ? `${Math.round(snapshot.followUpCompletionRate * 100)}%` : 'Not available'}</span></div>
          <div className="crm-perf-detail__row"><span>Calls handled</span><span>{snapshot.callsHandled}</span></div>
          {workload ? <div className="crm-perf-detail__row"><span>Current open workload</span><span>{workload.openConversations} conversations, {workload.overdueConversations} overdue</span></div> : null}
        </div>
      )}
    </Drawer>
  );
}
