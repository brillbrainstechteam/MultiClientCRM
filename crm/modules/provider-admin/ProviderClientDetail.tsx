import { useNavigate, useParams } from 'react-router-dom';
import { useQueryPatch } from '@crm/app/use-query-patch';
import { PageHeader } from '@crm/components';
import { Button, EmptyState } from '@crm/design-system';
import { findProviderClient } from '@crm/mock-data';
import { ClientDetailContent } from './ClientDetailContent';

/** Deep-linked full-page form of P03/P04 (CODE_FIRST_ADAPTER.md `/provider/clients/:tenantId`). */
export default function ProviderClientDetail() {
  const navigate = useNavigate();
  const { tenantId = '' } = useParams<{ tenantId: string }>();
  const [params, patch] = useQueryPatch();
  const tab = (params.get('tab') as 'connection' | 'billing' | null) ?? 'connection';
  const client = findProviderClient(tenantId);

  if (!client) {
    return (
      <div>
        <PageHeader title="Client not found" breadcrumbs={[{ label: 'Provider Admin', to: '/provider' }, { label: 'Clients', to: '/provider?tab=clients' }]} />
        <EmptyState
          title="This client doesn't exist"
          description="It may have been removed, or the link is out of date."
          actions={<Button variant="primary" onClick={() => navigate('/provider?tab=clients')}>Back to Clients</Button>}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={client.businessName}
        description={`${client.planName} plan · ${client.onboardingStage.replace('_', ' ')}`}
        breadcrumbs={[{ label: 'Provider Admin', to: '/provider' }, { label: 'Clients', to: '/provider?tab=clients' }, { label: client.businessName }]}
      />
      <ClientDetailContent tenantId={tenantId} tab={tab} onTabChange={(next) => patch({ tab: next })} />
    </div>
  );
}
