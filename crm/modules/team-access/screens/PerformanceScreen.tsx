import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Badge, Button, type Column, DataTable, EmptyState, KpiCard, Select } from '@crm/design-system';
import { performanceSnapshots, teamMembers, teamRecords } from '../team-access-mock-data';
import { memberTeamLabel } from '../team-access-selectors';
import type { PerformanceSnapshot, TeamMember } from '../team-access-types';

type Row = { member: TeamMember; snapshot: PerformanceSnapshot | undefined };

/** TEAM-S16 — Performance. Actionable snapshot; deep analysis stays in Reports. */
export default function PerformanceScreen() {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [searchParams, setSearchParams] = useSearchParams();

  const scope = searchParams.get('scope') ?? 'person';
  const teamFilter = searchParams.get('team');
  const forcedState = searchParams.get('state');

  const setScope = (value: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('scope', value);
      return next;
    });

  const rows: Row[] = teamMembers
    .filter((m) => m.employmentStatus === 'active')
    .filter((m) => !teamFilter || m.teamIds.includes(teamFilter))
    .map((member) => ({ member, snapshot: performanceSnapshots.find((p) => p.memberId === member.id) }));

  const withData = rows.filter((r) => r.snapshot?.dataAvailable);
  const totalAssigned = withData.reduce((sum, r) => sum + (r.snapshot?.assigned ?? 0), 0);
  const totalResolved = withData.reduce((sum, r) => sum + (r.snapshot?.resolved ?? 0), 0);
  const totalOverdue = withData.reduce((sum, r) => sum + (r.snapshot?.overdue ?? 0), 0);
  const avgFirstResponse = withData.length
    ? Math.round(withData.reduce((sum, r) => sum + (r.snapshot?.firstResponseMinutes ?? 0), 0) / withData.length)
    : null;
  const avgResolution = withData.length
    ? (withData.reduce((sum, r) => sum + (r.snapshot?.resolutionHours ?? 0), 0) / withData.length).toFixed(1)
    : null;
  const exceptions = rows.filter((r) => !r.snapshot || !r.snapshot.dataAvailable).length;

  const dataUnavailable = forcedState === 'data-unavailable' || rows.every((r) => !r.snapshot?.dataAvailable);

  const columns: Column<Row>[] = [
    { key: 'member', header: 'Member', render: (r) => r.member.name },
    { key: 'team', header: 'Team', render: (r) => memberTeamLabel(r.member) },
    { key: 'assigned', header: 'Assigned', render: (r) => (r.snapshot?.dataAvailable ? String(r.snapshot.assigned) : 'Not available') },
    { key: 'replied', header: 'Replied', render: (r) => (r.snapshot?.dataAvailable ? String(r.snapshot.replied) : 'Not available') },
    { key: 'resolved', header: 'Resolved', render: (r) => (r.snapshot?.dataAvailable ? String(r.snapshot.resolved) : 'Not available') },
    {
      key: 'overdue',
      header: 'Overdue',
      render: (r) =>
        r.snapshot?.dataAvailable ? (
          r.snapshot.overdue > 0 ? <Badge tone="warning">{r.snapshot.overdue}</Badge> : '0'
        ) : (
          'Not available'
        ),
    },
    { key: 'response', header: 'First response', render: (r) => (r.snapshot?.firstResponseMinutes !== null && r.snapshot?.firstResponseMinutes !== undefined ? `${r.snapshot.firstResponseMinutes}m` : 'Not available') },
    { key: 'resolution', header: 'Resolution time', render: (r) => (r.snapshot?.resolutionHours !== null && r.snapshot?.resolutionHours !== undefined ? `${r.snapshot.resolutionHours}h` : 'Not available') },
    { key: 'calls', header: 'Calls handled', render: (r) => (r.snapshot?.dataAvailable ? String(r.snapshot.callsHandled) : 'Not available') },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <Button variant="ghost" size="sm" onClick={() => navigate(scopedHref('/team-access/performance', { drawer: 'detail', subject: r.member.id }))}>
          Detail
        </Button>
      ),
    },
  ];

  return (
    <div className="crm-performance">
      <PageHeader
        title="Performance"
        description="Assigned, replied, resolved and overdue work with response/resolution time — one actionable snapshot. Deep trend analysis lives in Reports."
        toolbar={
          <div className="crm-performance__toolbar">
            <Select
              label="Scope"
              hideLabel
              size="sm"
              options={[{ value: 'person', label: 'By person' }, { value: 'team', label: 'By team' }]}
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            />
            {scope === 'team' ? (
              <Select
                label="Team"
                hideLabel
                size="sm"
                options={[{ value: '', label: 'All teams' }, ...teamRecords.map((t) => ({ value: t.id, label: t.id }))]}
                value={teamFilter ?? ''}
                onChange={(e) =>
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    if (e.target.value) next.set('team', e.target.value);
                    else next.delete('team');
                    return next;
                  })
                }
              />
            ) : null}
            <Button variant="secondary" size="sm" onClick={() => navigate('/reports')}>
              Open Reports for deep analysis
            </Button>
          </div>
        }
      />

      {dataUnavailable ? (
        <EmptyState title="Not available" description="Performance data hasn't accumulated for this scope yet — check back after members have handled some work." />
      ) : (
        <>
          <section aria-label="Key figures" className="crm-performance__kpis">
            <KpiCard label="Assigned" value={totalAssigned} meta="Across members with data" />
            <KpiCard label="Resolved" value={totalResolved} meta="Across members with data" />
            <KpiCard label="Overdue" value={totalOverdue} emphasis={totalOverdue > 0 ? 'gold' : undefined} meta="Needs attention" />
            <KpiCard label="Avg. first response" value={avgFirstResponse !== null ? `${avgFirstResponse}m` : 'Not available'} />
            <KpiCard label="Avg. resolution time" value={avgResolution !== null ? `${avgResolution}h` : 'Not available'} />
            <KpiCard label="Workload exceptions" value={exceptions} meta="No data yet or new hire" />
          </section>

          {scope === 'team' ? (
            <div className="crm-performance__team-list">
              {teamRecords
                .filter((t) => !teamFilter || t.id === teamFilter)
                .map((team) => {
                  const teamRows = rows.filter((r) => r.member.teamIds.includes(team.id));
                  const resolved = teamRows.reduce((sum, r) => sum + (r.snapshot?.resolved ?? 0), 0);
                  const overdue = teamRows.reduce((sum, r) => sum + (r.snapshot?.overdue ?? 0), 0);
                  return (
                    <div key={team.id} className="crm-performance__team-row">
                      <strong>{team.id}</strong>
                      <span>{teamRows.length} member(s) · {resolved} resolved · {overdue} overdue</span>
                      <Button variant="ghost" size="sm" onClick={() => navigate(scopedHref('/team-access/performance', { drawer: 'detail', subject: team.id }))}>
                        Detail
                      </Button>
                    </div>
                  );
                })}
            </div>
          ) : (
            <DataTable caption="Performance by member" columns={columns} rows={rows} rowKey={(r) => r.member.id} />
          )}
        </>
      )}
    </div>
  );
}
