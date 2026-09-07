import { ArrowLeft, Clock, ShieldAlert, TriangleAlert, UserRoundPlus, UsersRound } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { AttentionCard, Button, KpiCard } from '@crm/design-system';
import { PageHeader } from '@crm/components';
import { contentStateView } from '../components';
import { performanceSnapshots } from '../team-access-mock-data';
import { overviewStats } from '../team-access-selectors';

/**
 * TEAM-S01 — Overview. Actionable staffing/access/work risk snapshot. Does
 * not duplicate Dashboard or Reports (SPEC §3) — every figure drills into the
 * exact People/Work Distribution/Performance view behind it.
 */
export default function OverviewScreen() {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [searchParams, setSearchParams] = useSearchParams();
  const { branchId, branch, currentUser } = useWorkspace();

  const tabRedirect = searchParams.get('tab');
  useEffect(() => {
    if (tabRedirect === 'workload') {
      navigate(scopedHref('/team-access/work', { view: 'workload' }), { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabRedirect]);

  if (tabRedirect === 'workload') return null;

  const scope = { branchId: branchId === 'all' ? null : branchId };
  const stats = overviewStats(scope);

  const state = searchParams.get('state');
  const clearState = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('state');
      return next;
    });
  const stateView = contentStateView(state, { onRetry: clearState });

  const returnTo = searchParams.get('returnTo');
  const sourceModule = searchParams.get('sourceModule');

  const dataAvailable = performanceSnapshots.filter((p) => p.dataAvailable);
  const avgFirstResponse = dataAvailable.length
    ? Math.round(dataAvailable.reduce((sum, p) => sum + (p.firstResponseMinutes ?? 0), 0) / dataAvailable.length)
    : null;
  const avgResolution = dataAvailable.length
    ? (dataAvailable.reduce((sum, p) => sum + (p.resolutionHours ?? 0), 0) / dataAvailable.length).toFixed(1)
    : null;
  const totalOverdue = performanceSnapshots.reduce((sum, p) => sum + p.overdue, 0);
  const totalResolved = performanceSnapshots.reduce((sum, p) => sum + p.resolved, 0);

  return (
    <div className="crm-team-overview">
      <PageHeader
        title="Team & Access Overview"
        description={`Staffing, access and workload risk for ${branch ? branch.name : 'all branches in scope'}. Drill into any figure for the exact people behind it.`}
        breadcrumbs={
          returnTo
            ? [{ label: sourceModule ? sourceModule[0].toUpperCase() + sourceModule.slice(1) : 'Back', to: returnTo }, { label: 'Team & Access' }]
            : undefined
        }
        actions={
          <>
            {returnTo ? (
              <Button variant="secondary" iconLeft={<ArrowLeft />} onClick={() => navigate(returnTo)}>
                Back
              </Button>
            ) : null}
            <Button
              variant="secondary"
              iconLeft={<UsersRound />}
              onClick={() => navigate(scopedHref('/team-access/work', { view: 'workload' }))}
            >
              Review workload
            </Button>
            <Button
              variant="primary"
              iconLeft={<UserRoundPlus />}
              onClick={() => navigate(scopedHref('/team-access/people', { drawer: 'invite', step: 'identity' }))}
            >
              Invite team member
            </Button>
          </>
        }
      />

      {stateView ?? (
        <>
          <section aria-label="Key figures" className="crm-team-overview__kpis">
            <KpiCard label="Active members" value={stats.activeCount} icon={<UsersRound />} meta="In current scope" />
            <KpiCard label="Pending invites" value={stats.pendingCount} meta="Awaiting acceptance" />
            <KpiCard label="Unassigned work" value={stats.unassignedWork} meta="Waiting in fallback queues" emphasis="gold" />
            <KpiCard label="Inactive members" value={stats.inactiveCount} meta="Access blocked, history kept" />
          </section>

          <section aria-label="Needs attention" className="crm-team-overview__section">
            <h2 className="crm-team-overview__section-title">Needs attention</h2>
            <div className="crm-team-overview__attention">
              <AttentionCard
                title="Overloaded members"
                count={stats.overloadedCount}
                description="Over capacity on one or more work types"
                icon={<TriangleAlert />}
                tone="danger"
                to={scopedHref('/team-access/work', { view: 'workload', state: 'overload' })}
              />
              <AttentionCard
                title="Unavailable with open work"
                count={stats.unavailableWithWorkCount}
                description="Marked away/offline while still holding work"
                icon={<Clock />}
                tone="warn"
                to={scopedHref('/team-access/work', { view: 'workload' })}
              />
              <AttentionCard
                title="Number access issues"
                count={stats.numberIssueCount}
                description="Active members with no WhatsApp number access"
                icon={<ShieldAlert />}
                tone="warn"
                to={scopedHref('/team-access/structure', { view: 'numbers' })}
              />
              <AttentionCard
                title="Exit follow-up required"
                count={stats.exitAttentionCount}
                description="Offboarding transfers needing manual review"
                icon={<UserRoundPlus />}
                tone="neutral"
                to={scopedHref('/team-access/audit', { event: 'offboarding' })}
              />
            </div>
          </section>

          {currentUser.role !== 'agent' ? (
            <section aria-label="Performance snapshot" className="crm-team-overview__section">
              <h2 className="crm-team-overview__section-title">Performance snapshot</h2>
              <div className="crm-team-overview__snapshot">
                <KpiCard label="Resolved (period)" value={totalResolved} meta="Across all members" />
                <KpiCard label="Overdue" value={totalOverdue} meta="Needs owner attention" />
                <KpiCard label="Avg. first response" value={avgFirstResponse !== null ? `${avgFirstResponse}m` : 'Not available'} />
                <KpiCard label="Avg. resolution time" value={avgResolution !== null ? `${avgResolution}h` : 'Not available'} />
              </div>
            </section>
          ) : null}

          {currentUser.role === 'owner' ? (
            <section aria-label="Not in this build yet" className="crm-team-overview__section">
              <h2 className="crm-team-overview__section-title">Not in this build yet</h2>
              <ul className="crm-team-overview__deferred">
                <li><strong>Targets & goal tracking</strong> — Phase 2 (source metric reliability unresolved).</li>
                <li><strong>Shift-based availability</strong> — Phase 2; V1 availability uses employment, number access, manual status and capacity only.</li>
                <li><strong>Automatic escalation rule builder</strong> — Phase 2; escalations are resolved manually in Work Distribution today.</li>
                <li><strong>AI assignment recommendations</strong> — Phase 2, recommendation-only when it ships.</li>
                <li><strong>Manager summaries & risk alerts</strong> — Phase 2.</li>
                <li><strong>Advanced conversation quality review</strong> — Phase 2; stays owned by Inbox, not duplicated here.</li>
                <li><strong>HR/Directory sync</strong> — Phase 2.</li>
                <li><strong>Login/2FA/Sessions, Notification defaults, HR & API integrations</strong> — configured in workspace <a href="/settings">Settings</a>, not Team & Access.</li>
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
