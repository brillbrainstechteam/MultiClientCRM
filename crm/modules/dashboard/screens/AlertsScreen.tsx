import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { ALL_SCOPE, useWorkspace } from '@crm/app/workspace-context';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Badge, Button, DataTable, EmptyState, Select } from '@crm/design-system';
import type { Column } from '@crm/design-system';
import { findUser, findWhatsAppNumber, type DashboardAlert } from '@crm/mock-data';
import { useAlertStatus } from '../alert-status-context';
import { alertCategoryLabel, severityToBadgeTone } from '../dashboard-presentation';
import { filterAlerts, type DashboardScope } from '../dashboard-selectors';

const severityOptions = [
  { value: '', label: 'All severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const categoryOptions = [
  { value: '', label: 'All categories' },
  { value: 'inbox', label: 'Inbox' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'orders', label: 'Orders' },
  { value: 'payments', label: 'Payments' },
  { value: 'campaign', label: 'Campaigns' },
  { value: 'automation', label: 'Automation' },
  { value: 'team', label: 'Team' },
];

const statusOptions = [
  { value: '', label: 'Open (default)' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

/**
 * DASH-S02 — Alerts & Attention Centre. Full alert list with severity/
 * category/status filters (number/branch/team scope comes from the global
 * ScopeBar). Row actions and Open both go through DASH-S03.
 */
export default function AlertsScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const scopedHref = useScopedHref();
  const { branchId, whatsappNumberId } = useWorkspace();
  const { overrides, acknowledge, dismiss, resolve } = useAlertStatus();

  const scope: DashboardScope = {
    branchId: branchId === ALL_SCOPE ? null : branchId,
    whatsappNumberId: whatsappNumberId === ALL_SCOPE ? null : whatsappNumberId,
  };

  const severity = searchParams.get('severity');
  const category = searchParams.get('category');
  const status = searchParams.get('status');

  const alerts = filterAlerts(scope, { severity, category, status }, overrides);

  function setFilter(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  }

  function clearFilters() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['severity', 'category', 'status']) next.delete(key);
      return next;
    });
  }

  const hasFilters = Boolean(severity || category || status);

  const columns: Column<DashboardAlert>[] = [
    {
      key: 'severity',
      header: 'Severity',
      width: '110px',
      render: (alert) => <Badge tone={severityToBadgeTone(alert.severity)}>{alert.severity}</Badge>,
    },
    {
      key: 'issue',
      header: 'Issue',
      render: (alert) => (
        <span>
          <strong>{alert.title}</strong>
          <br />
          <span className="crm-alerts-screen__meta">{alertCategoryLabel[alert.category]}</span>
        </span>
      ),
    },
    { key: 'entity', header: 'Affected entity', render: (alert) => alert.affectedEntity },
    {
      key: 'owner',
      header: 'Owner',
      render: (alert) => {
        const owner = alert.ownerId ? findUser(alert.ownerId) : undefined;
        const number = alert.whatsappNumberId ? findWhatsAppNumber(alert.whatsappNumberId) : undefined;
        return owner?.name ?? number?.displayName ?? '—';
      },
    },
    {
      key: 'detected',
      header: 'Detected',
      render: (alert) => new Date(alert.detectedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    },
    {
      key: 'status',
      header: 'Status',
      render: (alert) => {
        const effective = overrides[alert.id] ?? alert.status;
        return (
          <Badge tone={effective === 'open' ? 'warning' : effective === 'resolved' ? 'success' : 'neutral'}>
            {effective}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (alert) => {
        const effective = overrides[alert.id] ?? alert.status;
        return (
          <div className="crm-alerts-screen__actions" onClick={(event) => event.stopPropagation()}>
            {effective === 'open' ? (
              <Button variant="ghost" size="sm" onClick={() => acknowledge(alert.id)}>
                Acknowledge
              </Button>
            ) : null}
            {alert.resolvable && effective !== 'resolved' ? (
              <Button variant="ghost" size="sm" onClick={() => resolve(alert.id)}>
                Resolve
              </Button>
            ) : null}
            {alert.dismissible && effective === 'open' ? (
              <Button variant="ghost" size="sm" onClick={() => dismiss(alert.id)}>
                Dismiss
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <div className="crm-alerts-screen">
      <PageHeader
        title="Alerts & Attention Centre"
        description="Every open and recently handled alert across the workspace, filtered to your current scope."
        breadcrumbs={[{ label: 'Dashboard', to: scopedHref('/dashboard') }, { label: 'Alerts' }]}
      />

      <div className="crm-alerts-screen__filters">
        <Select
          label="Severity"
          size="sm"
          options={severityOptions}
          value={severity ?? ''}
          onChange={(event) => setFilter('severity', event.target.value)}
        />
        <Select
          label="Category"
          size="sm"
          options={categoryOptions}
          value={category ?? ''}
          onChange={(event) => setFilter('category', event.target.value)}
        />
        <Select
          label="Status"
          size="sm"
          options={statusOptions}
          value={status ?? ''}
          onChange={(event) => setFilter('status', event.target.value)}
        />
        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        ) : null}
      </div>

      <DataTable
        caption="Dashboard alerts"
        columns={columns}
        rows={alerts}
        rowKey={(alert) => alert.id}
        onRowClick={(alert) => navigate(scopedHref('/dashboard/alerts', { drawer: 'alert', alertId: alert.id }))}
        emptyState={
          <EmptyState
            title="No alerts match the selected filters"
            description="Try a different severity, category or status, or clear filters to see everything in scope."
            actions={
              hasFilters ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        }
      />
    </div>
  );
}
