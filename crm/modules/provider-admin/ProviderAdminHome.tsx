import { useNavigate } from 'react-router-dom';
import { useQueryPatch } from '@crm/app/use-query-patch';
import { PageHeader } from '@crm/components';
import { Badge, Button, DataTable, EmptyState, KpiCard, Tabs, type Column, type TabItem } from '@crm/design-system';
import { platformReadiness, providerClients, type ProviderClientSummary } from '@crm/mock-data';
import { ClientDetailDrawer } from './ClientDetailDrawer';

const TOP_TABS: TabItem[] = [
  { id: 'platform', label: 'Platform' },
  { id: 'clients', label: 'Clients' },
  { id: 'connection', label: 'Connection Support' },
  { id: 'billing', label: 'Billing / Payer' },
];

const STAGE_TONE: Record<ProviderClientSummary['onboardingStage'], 'neutral' | 'info' | 'warning' | 'success'> = {
  not_started: 'neutral',
  in_progress: 'info',
  blocked: 'warning',
  live: 'success',
};

const STATUS_TONE = { operational: 'success', degraded: 'warning', down: 'danger' } as const;

/** P01–P04 as one workspace with four tabs (SKILL.md "Provider Admin simplification"). */
export default function ProviderAdminHome() {
  const navigate = useNavigate();
  const [params, patch] = useQueryPatch();
  const tab = params.get('tab') ?? 'platform';
  const drawerTenant = params.get('client');
  const drawerTab = (params.get('dtab') as 'connection' | 'billing' | null) ?? 'connection';

  const openClient = (tenantId: string, dtab: 'connection' | 'billing') => patch({ client: tenantId, dtab });

  const clientColumns: Column<ProviderClientSummary>[] = [
    { key: 'business', header: 'Client', render: (row) => <strong>{row.businessName}</strong> },
    { key: 'plan', header: 'Plan', render: (row) => row.planName },
    {
      key: 'stage',
      header: 'Onboarding stage',
      render: (row) => <Badge tone={STAGE_TONE[row.onboardingStage]}>{row.onboardingStage.replace('_', ' ')}</Badge>,
    },
    { key: 'numbers', header: 'Numbers', render: (row) => `${row.numbersConnected} live · ${row.numbersInSetup} in setup` },
    { key: 'activity', header: 'Last activity', render: (row) => new Date(row.lastActivity).toLocaleDateString() },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Button variant="secondary" size="sm" onClick={(event) => { event.stopPropagation(); openClient(row.tenantId, 'connection'); }}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="crm-provider-home">
      <PageHeader
        title="Provider Admin"
        description="Platform readiness, client onboarding monitor, connection support and billing/payer health."
        toolbar={<Tabs tabs={TOP_TABS} activeId={tab} onChange={(id) => patch({ tab: id })} ariaLabel="Provider Admin sections" />}
      />

      {tab === 'platform' ? (
        <div className="crm-provider-home__section">
          <div className="crm-provider-home__kpis">
            <KpiCard label="Clients" value={providerClients.length} />
            <KpiCard label="Live" value={providerClients.filter((c) => c.onboardingStage === 'live').length} />
            <KpiCard label="In progress" value={providerClients.filter((c) => c.onboardingStage === 'in_progress').length} />
            <KpiCard label="Blocked" value={providerClients.filter((c) => c.onboardingStage === 'blocked').length} />
          </div>
          <div className="crm-provider-home__metrics">
            {platformReadiness.map((metric) => (
              <div key={metric.id} className="crm-provider-home__metric">
                <div className="crm-provider-home__metric-head">
                  <span>{metric.label}</span>
                  <Badge tone={STATUS_TONE[metric.status]}>{metric.status}</Badge>
                </div>
                <p>{metric.detail}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'clients' ? (
        providerClients.length === 0 ? (
          <EmptyState title="No clients yet" description="Clients appear here once they sign up." />
        ) : (
          <DataTable caption="Provider clients" columns={clientColumns} rows={providerClients} rowKey={(row) => row.tenantId} onRowClick={(row) => openClient(row.tenantId, 'connection')} />
        )
      ) : null}

      {tab === 'connection' ? (
        <ConnectionQueue onOpen={(tenantId) => openClient(tenantId, 'connection')} />
      ) : null}

      {tab === 'billing' ? (
        <BillingQueue onOpen={(tenantId) => openClient(tenantId, 'billing')} />
      ) : null}

      <ClientDetailDrawer
        tenantId={drawerTenant}
        tab={drawerTab}
        onTabChange={(next) => patch({ dtab: next })}
        onClose={() => patch({ client: null, dtab: null })}
        onOpenFullPage={() => drawerTenant && navigate(`/provider/clients/${drawerTenant}?tab=${drawerTab}`)}
      />
    </div>
  );
}

function ConnectionQueue({ onOpen }: { onOpen: (tenantId: string) => void }) {
  const rows = providerClients.filter((client) => client.blocker);
  if (rows.length === 0) {
    return <EmptyState title="No open connection issues" description="Every client's technical connection is currently healthy." />;
  }
  return (
    <ul className="crm-provider-home__queue">
      {rows.map((client) => (
        <li key={client.tenantId}>
          <div>
            <strong>{client.businessName}</strong>
            <p>{client.technicalNotes}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onOpen(client.tenantId)}>Open</Button>
        </li>
      ))}
    </ul>
  );
}

function BillingQueue({ onOpen }: { onOpen: (tenantId: string) => void }) {
  const rows = providerClients.filter((client) => client.paymentStatus === 'failed' || client.payerMode === 'needs_attention');
  if (rows.length === 0) {
    return <EmptyState title="No billing/payer issues" description="Every client's payer status is currently healthy." />;
  }
  return (
    <ul className="crm-provider-home__queue">
      {rows.map((client) => (
        <li key={client.tenantId}>
          <div>
            <strong>{client.businessName}</strong>
            <p>{client.paymentStatus === 'failed' ? 'Last plan payment failed.' : 'Payer model needs attention.'}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onOpen(client.tenantId)}>Open</Button>
        </li>
      ))}
    </ul>
  );
}
