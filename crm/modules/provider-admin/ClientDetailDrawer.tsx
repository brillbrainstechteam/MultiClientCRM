import { Button, Drawer } from '@crm/design-system';
import { findProviderClient } from '@crm/mock-data';
import { ClientDetailContent } from './ClientDetailContent';

export interface ClientDetailDrawerProps {
  tenantId: string | null;
  tab: 'connection' | 'billing';
  onTabChange: (tab: 'connection' | 'billing') => void;
  onClose: () => void;
  onOpenFullPage: () => void;
}

/** Client detail drawer used from Clients / Connection Support / Billing tabs (SKILL.md "Provider Admin simplification"). */
export function ClientDetailDrawer({ tenantId, tab, onTabChange, onClose, onOpenFullPage }: ClientDetailDrawerProps) {
  const client = tenantId ? findProviderClient(tenantId) : undefined;

  return (
    <Drawer
      open={Boolean(tenantId)}
      title={client ? client.businessName : 'Client'}
      subtitle={tenantId ?? undefined}
      onClose={onClose}
      width="wide"
      footer={<Button variant="ghost" size="sm" onClick={onOpenFullPage}>Open as full page</Button>}
    >
      {tenantId ? <ClientDetailContent tenantId={tenantId} tab={tab} onTabChange={onTabChange} /> : null}
    </Drawer>
  );
}
