import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { Badge, Button, DataTable, EmptyState, Toast, type BadgeTone, type Column } from '@crm/design-system';
import { useWorkspace } from '@crm/app/workspace-context';
import { refreshCrmData } from '@crm/app/crm-data';

/**
 * WhatsApp numbers — the tenant's real connected numbers (derived from the
 * connected WhatsAppAccounts via the workspace). Connect flow goes to the real
 * onboarding. No mock registry.
 */
interface NumberRow { id: string; displayName: string; displayNumber: string; connectionStatus: string; qualityRating: string; messagingLimit: string }

const STATUS_TONE: Record<string, BadgeTone> = { connected: 'success', disconnected: 'danger', degraded: 'warning' };

export default function NumbersRealScreen() {
  const { availableWhatsAppNumbers } = useWorkspace();
  const rows = availableWhatsAppNumbers as unknown as NumberRow[];
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Connect / reconnect the number using the current WHATSAPP_TEST_TOKEN env
  // value (e.g. after rotating to a permanent token). Re-stores it in the DB.
  const applyToken = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/dev/connect-test', { method: 'POST', credentials: 'same-origin' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setToast(String(d.error ?? 'Could not connect the number.')); return; }
      setToast('Number connected with the current token. Sending now uses it.');
      await refreshCrmData();
    } finally { setBusy(false); }
  };

  const columns: Column<NumberRow>[] = [
    { key: 'name', header: 'Number', render: (n) => <div><strong>{n.displayName}</strong><div style={{ fontSize: 12, color: 'var(--crm-text-muted,#6b7a88)' }}>{n.displayNumber}</div></div> },
    { key: 'status', header: 'Connection', render: (n) => <Badge tone={STATUS_TONE[n.connectionStatus] ?? 'neutral'}>{n.connectionStatus}</Badge> },
    { key: 'quality', header: 'Quality', render: (n) => n.qualityRating },
    { key: 'limit', header: 'Messaging limit', render: (n) => n.messagingLimit },
  ];

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
      <PageHeader
        title="WhatsApp numbers"
        description="The numbers connected to this workspace."
        actions={<>
          <Button variant="secondary" iconLeft={<RefreshCw />} disabled={busy} onClick={applyToken} title="Connect/reconnect the number using the current server token">
            {busy ? 'Applying…' : 'Apply current token'}
          </Button>
          <Button variant="primary" iconLeft={<Plus />} onClick={() => { window.location.href = '/onboarding'; }}>Connect a number</Button>
        </>}
      />
      {rows.length === 0
        ? <EmptyState title="No numbers connected" description="Connect a WhatsApp Business number to start messaging."
            actions={<Button variant="primary" onClick={() => { window.location.href = '/onboarding'; }}>Connect a number</Button>} />
        : <DataTable caption="WhatsApp numbers" columns={columns} rows={rows} rowKey={(n) => n.id} />}
    </div>
  );
}
