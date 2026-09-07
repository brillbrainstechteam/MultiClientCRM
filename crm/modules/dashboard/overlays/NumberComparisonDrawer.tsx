import { useSearchParams } from 'react-router-dom';
import { useWorkspace } from '@crm/app/workspace-context';
import { Badge, DataTable, Drawer, StatusBadge } from '@crm/design-system';
import type { Column } from '@crm/design-system';
import type { WhatsAppNumber } from '@crm/mock-data';
import { useAlertStatus } from '../alert-status-context';
import { connectionLabel, connectionTone, qualityLabel, qualityTone } from '../dashboard-presentation';
import { numberAlerts } from '../dashboard-selectors';

/**
 * DASH-S06 — Number Health Comparison. Compares every number the acting user
 * is permitted to see; selecting a row opens DASH-S05 for that number.
 */
export function NumberComparisonDrawer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { availableWhatsAppNumbers } = useWorkspace();
  const { overrides } = useAlertStatus();

  const open = searchParams.get('drawer') === 'number-comparison';

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('drawer');
      return next;
    });

  const openNumber = (numberId: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('drawer', 'wa-health');
      next.set('whatsappNumberId', numberId);
      return next;
    });

  if (!open) return null;

  const numbers = availableWhatsAppNumbers;

  const columns: Column<WhatsAppNumber>[] = [
    {
      key: 'identity',
      header: 'Number',
      render: (number) => <strong>{number.displayName}</strong>,
    },
    { key: 'brand', header: 'Brand / department', render: (n) => `${n.brand} · ${n.department}` },
    {
      key: 'connection',
      header: 'Connection',
      render: (n) => <StatusBadge tone={connectionTone[n.connectionStatus]}>{connectionLabel[n.connectionStatus]}</StatusBadge>,
    },
    {
      key: 'quality',
      header: 'Quality',
      render: (n) => <Badge tone={qualityTone[n.qualityRating]}>{qualityLabel[n.qualityRating]}</Badge>,
    },
    { key: 'limit', header: 'Messaging limit', render: (n) => n.messagingLimit },
    {
      key: 'alerts',
      header: 'Open alerts',
      align: 'right',
      render: (n) => numberAlerts(n.id, overrides).length,
    },
  ];

  return (
    <Drawer open={open} onClose={close} title="Compare WhatsApp numbers" width="wide">
      <DataTable
        caption="WhatsApp number health comparison"
        columns={columns}
        rows={numbers}
        rowKey={(n) => n.id}
        onRowClick={(n) => openNumber(n.id)}
      />
    </Drawer>
  );
}
