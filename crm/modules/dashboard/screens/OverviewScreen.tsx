import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScreenState } from '@crm/app/use-screen-state';
import { useConnectionStatus } from '@crm/app/use-connection-status';
import { useAlertStatus } from '../alert-status-context';
import { ALL_SCOPE, useWorkspace } from '@crm/app/workspace-context';
import DashboardZeroState from './DashboardZeroState';
import { Banner, Button, EmptyState, ErrorState, LoadingSkeleton } from '@crm/design-system';
import {
  DASHBOARD_REFERENCE_NOW,
  dateRangeLabels,
  setupCompletionPercent,
  setupSteps,
  setupStepsAllComplete,
  type DateRange,
  type WhatsAppNumber,
} from '@crm/mock-data';
import {
  BranchPerformanceTable,
  DashboardHeaderControls,
  DashboardKpiRow,
  NumberHealthTable,
  PlanCreditsStrip,
  PriorityAlerts,
  SetupChecklistBar,
  TeamWorkloadWidget,
  TodaysWorkPanel,
  WhatsAppHealthIndicator,
} from '../components';
import {
  branchPerformanceRows,
  dashboardKpis,
  numberHealthRows,
  openAlertCount,
  personalKpis,
  priorityAlerts,
  scopedBranchIds,
  scopedTeamWorkload,
  todaysWork,
  type DashboardScope,
} from '../dashboard-selectors';
import { widgetPolicyFor } from '../role-widget-policy';

/**
 * DASH-S01 — Dashboard Overview, redesigned for SME clarity. Answers three
 * questions in order: what needs attention, how the business is performing, and
 * which branch/number needs action. Role presets (owner / manager / executive)
 * decide which sections render. `?state=` reproduces loading / empty / error /
 * healthy without a page per state; `?dateRange=` changes every figure.
 */
export default function OverviewScreen() {
  const { role, branchId, whatsappNumberId, whatsappNumber, currentUser, availableBranches, availableWhatsAppNumbers } =
    useWorkspace();
  const { state } = useScreenState();
  const { connected } = useConnectionStatus();
  const { overrides } = useAlertStatus();
  const [searchParams, setSearchParams] = useSearchParams();
  const [refreshing, setRefreshing] = useState(false);

  const policy = widgetPolicyFor(role);

  // Logged in but no WhatsApp number connected yet → first-run zero state.
  if (!connected) {
    return <DashboardZeroState firstName={currentUser.name.split(' ')[0]} />;
  }
  const range = (searchParams.get('dateRange') as DateRange) ?? '7d';

  const scope: DashboardScope = {
    branchId: branchId === ALL_SCOPE ? null : branchId,
    whatsappNumberId: whatsappNumberId === ALL_SCOPE ? null : whatsappNumberId,
  };

  const isHealthy = state === 'healthy';
  const isPartialError = state === 'partial-error';
  const isLoading = state === 'loading';
  const isError = state === 'error';
  const isEmpty = state === 'empty';

  const branchIds = scopedBranchIds(availableBranches.map((b) => b.id), scope);
  const rangeLabel = dateRangeLabels[range];
  const scopeLabel = [
    branchId === ALL_SCOPE ? 'All branches' : availableBranches.find((b) => b.id === branchId)?.name,
    rangeLabel,
  ]
    .filter(Boolean)
    .join(' · ');

  const healthNumbers = whatsappNumber ? [whatsappNumber] : availableWhatsAppNumbers;
  const showHealthIndicator = policy.whatsappHealth && healthNumbers.length > 0;

  function handleRefresh() {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 800);
  }

  function retry() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('state');
      return next;
    });
  }

  const header = (
    <PageHeader
      title="Dashboard"
      actions={
        <DashboardHeaderControls
          lastUpdatedIso={DASHBOARD_REFERENCE_NOW}
          nowIso={DASHBOARD_REFERENCE_NOW}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          canCustomise={policy.customise}
          canExport={policy.export}
        />
      }
    />
  );

  if (isLoading) {
    return (
      <div className="crm-dashboard-overview">
        {header}
        <LoadingSkeleton height={72} />
        <LoadingSkeleton height={110} />
        <LoadingSkeleton height={200} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="crm-dashboard-overview">
        {header}
        <ErrorState
          title="We couldn’t load your dashboard"
          description="This is usually temporary. Refresh to try again."
          actions={<Button variant="primary" onClick={retry}>Retry</Button>}
        />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="crm-dashboard-overview">
        {header}
        <EmptyState
          title="Nothing to show for this filter"
          description="No activity in the selected branch, number or date range. Try widening the filters."
          actions={<Button variant="secondary" onClick={retry}>Reset filters</Button>}
        />
      </div>
    );
  }

  const steps = isHealthy ? setupStepsAllComplete() : setupSteps;
  const setupPercent = setupCompletionPercent(steps);
  const alerts = isHealthy
    ? []
    : role === 'agent'
      ? priorityAlerts(scope, overrides).filter((a) => a.category === 'inbox')
      : priorityAlerts(scope, overrides);
  const totalOpen = isHealthy ? 0 : openAlertCount(scope, overrides);

  const kpis =
    role === 'agent' ? personalKpis(currentUser.id, range) : dashboardKpis(branchIds, range);

  return (
    <div className="crm-dashboard-overview">
      {header}

      {isPartialError ? (
        <Banner
          tone="danger"
          title="Some dashboard data could not be loaded"
          description="Branch and number figures are current; a few widgets may be stale."
          actions={<Button variant="secondary" size="sm" onClick={handleRefresh}>Retry</Button>}
        />
      ) : null}

      {policy.setupChecklist ? <SetupChecklistBar steps={steps} percent={setupPercent} /> : null}

      {/* Plan & credits — billing-relevant roles only. */}
      {role !== 'agent' ? <PlanCreditsStrip /> : null}

      {showHealthIndicator ? (
        <WhatsAppHealthIndicator numbers={healthNumbers} forceHealthy={isHealthy} />
      ) : null}

      <DashboardKpiRow kpis={kpis} comparisonLabel="" />

      <section aria-label="Needs attention" className="crm-dash-section">
        <h2 className="crm-dash-section-title">Needs attention</h2>
        <PriorityAlerts alerts={alerts} totalOpen={totalOpen} viewAllTo="/dashboard/alerts" />
      </section>

      {role === 'agent' ? (
        <AgentSections range={range} scopeLabel={scopeLabel} branchIds={branchIds} />
      ) : (
        <OwnerManagerSections
          scope={scope}
          range={range}
          scopeLabel={scopeLabel}
          branchIds={branchIds}
          numbers={healthNumbers}
          showTeam={policy.team}
          canReassign={policy.reassignWork}
          isPartialError={isPartialError}
        />
      )}
    </div>
  );
}

function OwnerManagerSections({
  scope,
  range,
  scopeLabel,
  branchIds,
  numbers,
  showTeam,
  canReassign,
  isPartialError,
}: {
  scope: DashboardScope;
  range: DateRange;
  scopeLabel: string;
  branchIds: string[];
  numbers: WhatsAppNumber[];
  showTeam: boolean;
  canReassign: boolean;
  isPartialError: boolean;
}) {
  const branchRows = branchPerformanceRows(branchIds, range);
  const work = todaysWork(branchIds, range);
  const numberRows = numberHealthRows(numbers, scope, range);
  const teamRows = scopedTeamWorkload(scope);

  return (
    <>
      <div className="crm-dash-split">
        <BranchPerformanceTable
          rows={branchRows}
          contextLabel={scopeLabel}
          state={isPartialError ? 'error' : undefined}
        />
        <TodaysWorkPanel work={work} contextLabel={scopeLabel} />
      </div>

      <NumberHealthTable rows={numberRows} contextLabel={scopeLabel} />

      {showTeam ? <TeamWorkloadWidget rows={teamRows} canReassign={canReassign} /> : null}
    </>
  );
}

function AgentSections({
  range,
  scopeLabel,
  branchIds,
}: {
  range: DateRange;
  scopeLabel: string;
  branchIds: string[];
}) {
  const work = todaysWork(branchIds, range);
  return (
    <div className="crm-dash-split">
      <TodaysWorkPanel work={work} contextLabel={scopeLabel} scope="personal" />
      <div />
    </div>
  );
}
