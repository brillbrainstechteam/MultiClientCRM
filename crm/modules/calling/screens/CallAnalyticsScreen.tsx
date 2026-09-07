import { useMemo } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Percent,
  PhoneCall,
  PhoneMissed,
  ThumbsUp,
  Timer,
  Trophy,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { Button, KpiCard, PermissionRestricted, Select } from '@crm/design-system';
import { teams, users } from '@crm/mock-data';
import { useCallingData } from '../calling-data-context';
import { analyticsSummary, applyBranchScope } from '../calling-selectors';
import { callingNumbers, findCallList } from '../data';
import { referenceNow, type CallAttempt, type CallTask } from '../domain';
import { can } from '../permissions';

const dateRanges = [
  { value: 'all', label: 'All time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
];

/** CALL-S14 — Calling Analytics: lightweight operational metrics, not a BI page. */
export default function CallAnalyticsScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role, currentUser, branchId } = useWorkspace();
  const { tasks, attempts } = useCallingData();

  if (!can(role, 'calling.view_analytics')) {
    return (
      <div className="crm-analytics">
        <PageHeader title="Calling Analytics" description="Operational calling metrics." />
        <PermissionRestricted
          title="You don't have access to Calling Analytics"
          description="Ask a manager or owner if you need visibility into team-level calling metrics."
        />
      </div>
    );
  }

  const agentFilter = searchParams.get('agentId');
  const teamFilter = searchParams.get('teamId');
  const sourceFilter = searchParams.get('source');
  const range = searchParams.get('range') ?? 'all';
  const listId = searchParams.get('listId');
  const list = listId ? findCallList(listId) : undefined;

  const setParam = (key: string, value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
      return next;
    });
  };

  const scopedTasks = applyBranchScope(tasks, branchId === 'all' ? null : branchId);
  const roleScopedTasks =
    role === 'agent' ? scopedTasks.filter((t) => t.assigneeId === currentUser.id) : scopedTasks;

  let filteredTasks: CallTask[] = list ? roleScopedTasks.filter((t) => t.listId === list.id) : roleScopedTasks;
  if (agentFilter) filteredTasks = filteredTasks.filter((t) => t.assigneeId === agentFilter);
  if (teamFilter) filteredTasks = filteredTasks.filter((t) => t.teamId === teamFilter);
  if (sourceFilter) filteredTasks = filteredTasks.filter((t) => t.source === sourceFilter);

  const filteredTaskIds = new Set(filteredTasks.map((t) => t.id));
  let filteredAttempts: CallAttempt[] = attempts.filter((a) => filteredTaskIds.has(a.taskId));
  if (range !== 'all') {
    const cutoff = referenceNow().getTime() - Number(range) * 24 * 60 * 60 * 1000;
    filteredAttempts = filteredAttempts.filter((a) => new Date(a.startedAt).getTime() >= cutoff);
  }

  const summary = analyticsSummary(filteredTasks, filteredAttempts);

  const bySource = useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of filteredTasks) counts.set(task.source, (counts.get(task.source) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [filteredTasks]);

  const agentOptions = [
    { value: '', label: 'All agents' },
    ...users.filter((u) => u.role !== 'owner').map((u) => ({ value: u.id, label: u.name })),
  ];
  const teamOptions = [{ value: '', label: 'All teams' }, ...teams.map((t) => ({ value: t.id, label: t.name }))];
  const distinctSources = [...new Set(scopedTasks.map((t) => t.source))].sort();
  const sourceOptions = [{ value: '', label: 'All sources' }, ...distinctSources.map((s) => ({ value: s, label: s }))];

  const scopedNumbers = callingNumbers.filter((n) => branchId === 'all' || n.branchId === branchId);

  return (
    <div className="crm-analytics">
      <PageHeader
        title="Calling Analytics"
        description={
          list
            ? `Scoped to "${list.name}". Clear the list filter to see the full picture.`
            : 'Operational signals for the calling team — attempted, connected, follow-ups and conversion first.'
        }
        actions={
          <>
            {list ? (
              <Button variant="ghost" onClick={() => setParam('listId', null)}>
                Clear list filter
              </Button>
            ) : null}
            {can(role, 'calling.export') ? (
              <Button variant="secondary" onClick={() => setParam('exported', String(Date.now()))}>
                Export
              </Button>
            ) : null}
            <Button
              variant="ghost"
              onClick={() =>
                navigate(scopedHref('/reports', { sourceModule: 'calling', returnTo: '/calling/analytics' }))
              }
            >
              Open in Reports
            </Button>
          </>
        }
      />

      <div className="crm-analytics__toolbar">
        {can(role, 'calling.view_team') ? (
          <Select label="Agent" hideLabel size="sm" options={agentOptions} value={agentFilter ?? ''} onChange={(e) => setParam('agentId', e.target.value)} />
        ) : null}
        {can(role, 'calling.view_team') ? (
          <Select label="Team" hideLabel size="sm" options={teamOptions} value={teamFilter ?? ''} onChange={(e) => setParam('teamId', e.target.value)} />
        ) : null}
        <Select label="Source" hideLabel size="sm" options={sourceOptions} value={sourceFilter ?? ''} onChange={(e) => setParam('source', e.target.value)} />
        <Select label="Date range" hideLabel size="sm" options={dateRanges} value={range} onChange={(e) => setParam('range', e.target.value)} />
        {can(role, 'calling.view_team') ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              navigate(scopedHref('/team-access', { sourceModule: 'calling', returnTo: '/calling/analytics' }))
            }
          >
            Manage team access
          </Button>
        ) : null}
      </div>

      <div className="crm-analytics__primary">
        <KpiCard label="Attempted" value={summary.attempted} icon={<PhoneCall />} />
        <KpiCard label="Connected" value={summary.connected} icon={<CheckCircle2 />} />
        <KpiCard label="Completed" value={summary.completed} icon={<CalendarCheck />} />
        <KpiCard label="Connection rate" value={`${summary.connectionRate}%`} icon={<Percent />} emphasis="gold" />
        <KpiCard label="Follow-ups created" value={summary.followUpsCreated} icon={<Timer />} />
        <KpiCard label="Follow-ups completed" value={summary.followUpsCompleted} icon={<CalendarCheck />} />
        <KpiCard label="Interested" value={summary.interested} icon={<ThumbsUp />} />
        <KpiCard label="Converted" value={summary.converted} icon={<Trophy />} />
      </div>

      <div className="crm-analytics__secondary">
        <section className="crm-analytics__panel">
          <h2>Secondary</h2>
          <dl className="crm-analytics__facts">
            <div>
              <dt>Unanswered</dt>
              <dd>{summary.unanswered}</dd>
            </div>
            <div>
              <dt>Average call duration</dt>
              <dd>{summary.avgDurationSeconds > 0 ? formatDuration(summary.avgDurationSeconds) : '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="crm-analytics__panel">
          <h2>By source</h2>
          {bySource.length === 0 ? (
            <p className="crm-analytics__muted">No call tasks in this scope yet.</p>
          ) : (
            <ul className="crm-analytics__bars">
              {bySource.map(([source, count]) => (
                <li key={source}>
                  <span className="crm-analytics__bar-label">{source}</span>
                  <span className="crm-analytics__bar-value">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {can(role, 'calling.view_cost') ? (
          <section className="crm-analytics__panel">
            <h2>
              <PhoneMissed size={14} /> Provider usage
            </h2>
            {scopedNumbers.length === 0 ? (
              <p className="crm-analytics__muted">No calling numbers in this scope.</p>
            ) : (
              <ul className="crm-analytics__usage">
                {scopedNumbers.map((number) => (
                  <li key={number.id}>
                    <span>{number.label}</span>
                    <span className="crm-analytics__muted">
                      {number.providerConnected
                        ? (number.costLabel ?? 'Not provided by telephony provider')
                        : 'No provider connected'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="crm-analytics__hint">
              Cost is calculated by the telephony provider, never estimated locally. Full Cost &amp; Usage reporting is a
              future capability once a provider is connected.
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
