import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Badge, Banner, Button, Tabs, type TabItem } from '@crm/design-system';
import { findProviderClient } from '@crm/mock-data';

export interface ClientDetailContentProps {
  tenantId: string;
  tab: 'connection' | 'billing';
  onTabChange: (tab: 'connection' | 'billing') => void;
}

const TABS: TabItem[] = [
  { id: 'connection', label: 'Connection Support' },
  { id: 'billing', label: 'Billing / Payer Health' },
];

const PAYMENT_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  success: 'success',
  pending: 'warning',
  failed: 'danger',
  not_applicable: 'neutral',
};

/**
 * P03/P04 body, shared between the Clients-tab drawer and the deep-linked
 * `/provider/clients/:tenantId` route (CODE_FIRST_ADAPTER.md §1) so both
 * surfaces stay identical. Technical IDs and payer detail only — never
 * customer conversation or business data (SKILL.md "least privilege").
 */
export function ClientDetailContent({ tenantId, tab, onTabChange }: ClientDetailContentProps) {
  const [retryRequested, setRetryRequested] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const client = findProviderClient(tenantId);

  if (!client) {
    return <Banner tone="warning" title="Client not found" description="This tenant ID does not match a known client fixture." />;
  }

  return (
    <div className="crm-client-detail">
      <Tabs tabs={TABS} activeId={tab} onChange={(id) => onTabChange(id as 'connection' | 'billing')} ariaLabel="Client support sections" />

      {tab === 'connection' ? (
        <div className="crm-client-detail__section">
          {client.blocker ? (
            <Banner tone="danger" title="Open technical issue" description={client.technicalNotes} />
          ) : (
            <Banner tone="info" title="No open technical issues" description={client.technicalNotes} />
          )}
          <dl className="crm-client-detail__facts">
            <div><dt>System user token</dt><dd>Issued · business_management scope</dd></div>
            <div><dt>Webhook subscription</dt><dd>{client.blocker === 'webhook_setup_issue' ? 'Failed to confirm' : 'Confirmed'}</dd></div>
            <div><dt>Numbers connected</dt><dd>{client.numbersConnected}</dd></div>
            <div><dt>Numbers in setup</dt><dd>{client.numbersInSetup}</dd></div>
            <div><dt>Last activity</dt><dd>{new Date(client.lastActivity).toLocaleString()}</dd></div>
          </dl>
          <h3 className="crm-client-detail__log-title">Recent events</h3>
          <ul className="crm-client-detail__log">
            <li>{new Date(client.lastActivity).toLocaleDateString()} — Account connected, system user token issued.</li>
            {client.blocker === 'webhook_setup_issue' ? <li>Webhook confirmation callback timed out after 3 retries.</li> : null}
            <li>Last end-to-end test message: delivered.</li>
          </ul>
          {client.blocker === 'webhook_setup_issue' ? (
            <Button variant="secondary" iconLeft={<RefreshCw />} disabled={retryRequested} onClick={() => setRetryRequested(true)}>
              {retryRequested ? 'Retry requested — support notified' : 'Request safe retry'}
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="crm-client-detail__section">
          <dl className="crm-client-detail__facts">
            <div><dt>Payer mode</dt><dd>{client.payerMode === 'provider_wallet' ? 'Provider-funded wallet' : client.payerMode === 'direct_meta' ? 'Direct Meta billing' : 'Needs attention'}</dd></div>
            <div><dt>Plan</dt><dd>{client.planName}</dd></div>
            <div>
              <dt>Last payment</dt>
              <dd><Badge tone={PAYMENT_TONE[client.paymentStatus]}>{client.paymentStatus.replace('_', ' ')}</Badge></dd>
            </div>
            {client.walletBalance !== null ? <div><dt>Wallet balance</dt><dd>₹{client.walletBalance.toFixed(2)}</dd></div> : null}
          </dl>
          {client.paymentStatus === 'failed' ? (
            <Banner tone="warning" title="Last payment failed" description="Retrying is idempotent — the client will not be charged twice for the same period." />
          ) : null}
          <Button variant="secondary" disabled={escalated} onClick={() => setEscalated(true)}>
            {escalated ? 'Escalated to billing team' : 'Escalate to billing team'}
          </Button>
        </div>
      )}
    </div>
  );
}
