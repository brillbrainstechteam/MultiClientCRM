import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { Badge, Banner, Button, Input, KpiCard, PermissionRestricted, Select, TrendMini } from '@crm/design-system';
import { useAgents, useAiAgentsStore, useAllUsageSummaries } from '../ai-agents-store';
import { can } from '../permissions';

function parseCostLabel(label: string): number | null {
  const match = label.match(/[\d,]+/);
  if (!match) return null;
  return Number(match[0].replace(/,/g, ''));
}

/** AIA-S04 Usage & Cost — basic mandatory tier (SKILL.md "Usage & Cost": estimated, non-authoritative). */
export default function UsageCostScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role, visibleModules, currentUser } = useWorkspace();
  const { dispatch } = useAiAgentsStore();
  const agents = useAgents();
  const summaries = useAllUsageSummaries();
  const [thresholdDrafts, setThresholdDrafts] = useState<Record<string, string>>({});

  if (!visibleModules.includes('ai-assistance')) {
    return <PermissionRestricted title="You do not have access to AI Agents" description={`Your role (${currentUser.roleLabel}) cannot open this area.`} />;
  }

  const canViewUsage = can(role, 'ai_agent.view_usage');
  const canManageThreshold = can(role, 'ai_agent.edit');

  if (!canViewUsage) {
    return <PermissionRestricted title="You do not have access to Usage & Cost" description={`Your role (${currentUser.roleLabel}) cannot view usage and cost data.`} />;
  }

  const agentFilter = searchParams.get('agent');
  const forcedState = searchParams.get('state');
  const period = searchParams.get('period') ?? 'this-month';

  const rows = summaries.filter((summary) => {
    if (agentFilter && summary.agentId !== agentFilter) return false;
    if (forcedState === 'threshold-warning') return summary.thresholdState !== 'ok';
    if (forcedState === 'cost-unavailable') return summary.costUnavailable;
    return true;
  });

  const totalUnits = summaries.reduce((sum, s) => sum + s.usageUnits, 0);
  const totalCost = summaries.reduce((sum, s) => sum + (parseCostLabel(s.estimatedCostLabel) ?? 0), 0);
  const overThresholdCount = summaries.filter((s) => s.thresholdState !== 'ok').length;
  const unavailableCount = summaries.filter((s) => s.costUnavailable).length;

  const setParam = (key: string, value: string | null) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!value) next.delete(key);
      else next.set(key, value);
      return next;
    });

  const saveThreshold = (agentId: string) => {
    const raw = thresholdDrafts[agentId];
    const value = raw !== undefined ? Number(raw) : NaN;
    if (Number.isNaN(value) || value <= 0) return;
    dispatch({ type: 'SET_ALERT_THRESHOLD', agentId, threshold: value });
    setThresholdDrafts((prev) => {
      const next = { ...prev };
      delete next[agentId];
      return next;
    });
  };

  return (
    <div className="crm-aia__page">
      <PageHeader
        title="Usage & Cost"
        description="Estimated cost — prototype data for planning only, not authoritative provider billing."
        actions={<Button variant="secondary" onClick={() => navigate(scopedHref('/ai-agents'))}>Back to AI Agents</Button>}
      />

      {forcedState === 'threshold-warning' ? (
        <Banner tone="warning" title="Usage threshold alerts" description="These agents are near or over their configured usage threshold." />
      ) : forcedState === 'cost-unavailable' ? (
        <Banner tone="info" title="Estimated cost unavailable" description="These agents don't have enough usage data yet, or their cost source is disconnected." />
      ) : null}

      <div className="crm-aia__toolbar">
        <Select
          label="Agent"
          hideLabel
          size="sm"
          options={[{ value: '', label: 'All agents' }, ...agents.map((a) => ({ value: a.id, label: a.name }))]}
          value={agentFilter ?? ''}
          onChange={(e) => setParam('agent', e.target.value || null)}
        />
        <Select
          label="Period"
          hideLabel
          size="sm"
          options={[{ value: 'this-month', label: 'This month' }]}
          value={period}
          onChange={(e) => setParam('period', e.target.value)}
        />
      </div>

      <div className="crm-aia__kpi-row">
        <KpiCard label="Total usage" value={totalUnits.toLocaleString('en-IN')} meta="Units this month, all agents" />
        <KpiCard label="Total estimated cost" value={`≈ ₹${totalCost.toLocaleString('en-IN')}`} meta="Excludes agents with unavailable cost" />
        <KpiCard label="Over/near threshold" value={overThresholdCount} meta={overThresholdCount > 0 ? 'Review usage or raise the threshold' : 'All agents within budget'} emphasis={overThresholdCount > 0 ? 'gold' : 'default'} />
        <KpiCard label="Cost unavailable" value={unavailableCount} meta="Agents without enough usage data yet" />
      </div>

      <div className="crm-aia__usage-table-wrap">
        {rows.length === 0 ? (
          <div className="crm-aia__card">
            <p className="crm-aia__muted">No agents match this filter.</p>
          </div>
        ) : (
          rows.map((summary) => {
            const agent = agents.find((a) => a.id === summary.agentId);
            if (!agent) return null;
            const draft = thresholdDrafts[summary.agentId];
            return (
              <div key={summary.agentId} className="crm-aia__card">
                <div className="crm-aia__toolbar">
                  <div>
                    <h3 className="crm-aia__card-title">{agent.name}</h3>
                    <p className="crm-aia__card-subtitle">{summary.periodLabel}</p>
                  </div>
                  <div className="crm-aia__badge-row">
                    <Badge tone={summary.thresholdState === 'exceeded' ? 'danger' : summary.thresholdState === 'warning' ? 'warning' : 'success'}>
                      {summary.thresholdState === 'exceeded' ? 'Over threshold' : summary.thresholdState === 'warning' ? 'Near threshold' : 'Within threshold'}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => navigate(scopedHref(`/ai-agents/${agent.id}`))}>Open agent</Button>
                  </div>
                </div>

                <div className="crm-aia__form-grid">
                  <div>
                    <p className="crm-aia__section-hint">Usage this period</p>
                    <p className="crm-aia__card-title">{summary.usageUnits.toLocaleString('en-IN')} units</p>
                  </div>
                  <div>
                    <p className="crm-aia__section-hint">Estimated cost</p>
                    <p className="crm-aia__card-title">{summary.costUnavailable ? 'Unavailable' : summary.estimatedCostLabel}</p>
                  </div>
                </div>

                {summary.costUnavailable || summary.trend.length === 0 ? (
                  <p className="crm-aia__muted">Usage-over-time is unavailable for this agent yet.</p>
                ) : (
                  <TrendMini
                    label="Usage over time"
                    points={summary.trend.map((point) => point.units)}
                    currentTotal={summary.trend[summary.trend.length - 1]?.units ?? 0}
                    previousTotal={summary.trend.slice(0, -1).reduce((sum, point) => sum + point.units, 0) || summary.usageUnits}
                    unit=" units"
                  />
                )}

                {canManageThreshold ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <Input
                      label={`Admin alert threshold for ${agent.name}`}
                      hideLabel
                      type="number"
                      min={1}
                      placeholder={`Threshold: ${summary.alertThreshold}`}
                      value={draft ?? ''}
                      onChange={(e) => setThresholdDrafts((prev) => ({ ...prev, [summary.agentId]: e.target.value }))}
                    />
                    <Button variant="secondary" size="sm" onClick={() => saveThreshold(summary.agentId)} disabled={!draft}>Save threshold</Button>
                  </div>
                ) : (
                  <p className="crm-aia__section-hint">Admin alert threshold: {summary.alertThreshold.toLocaleString('en-IN')} units</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
