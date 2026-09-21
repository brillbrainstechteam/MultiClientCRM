import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { Badge, Button, DataTable, EmptyState, type BadgeTone, type Column } from '@crm/design-system';
import { useWorkspace } from '@crm/app/workspace-context';
import './NumbersReal.css';

/**
 * WhatsApp numbers registry — the tenant's real connected numbers (from the
 * connected WhatsAppAccounts via /api/crm/bootstrap). Quality is per-number
 * (Meta GREEN/YELLOW/RED); the messaging tier is a portfolio-level allowance
 * shared across all numbers. Connecting/re-keying happens in /onboarding.
 */
interface NumberRow {
  id: string;
  displayName: string;
  displayNumber: string;
  department: string;
  connectionStatus: string;
  qualityRating: string;   // mapped: high|medium|low|unrated
  qualityRaw: string | null; // GREEN|YELLOW|RED
  messagingLimit: string;
  codeVerificationStatus: string | null;
}

const STATUS_TONE: Record<string, BadgeTone> = { connected: 'success', disconnected: 'danger', degraded: 'warning' };
const QUALITY_TONE: Record<string, BadgeTone> = { high: 'success', medium: 'warning', low: 'danger', unrated: 'neutral' };
const QUALITY_LABEL: Record<string, string> = { high: 'Green · High', medium: 'Yellow · Medium', low: 'Red · Low', unrated: 'Unrated' };
const VERIFY_TONE: Record<string, BadgeTone> = { VERIFIED: 'success', NOT_VERIFIED: 'warning', EXPIRED: 'danger' };

export default function NumbersRealScreen() {
  const navigate = useNavigate();
  const { availableWhatsAppNumbers } = useWorkspace();
  const rows = availableWhatsAppNumbers as unknown as NumberRow[];

  // The messaging allowance is one portfolio tier shared by every number.
  const sharedTier = rows.map((r) => r.messagingLimit).find((t) => t && t !== '—') ?? '—';

  const columns: Column<NumberRow>[] = [
    {
      key: 'name', header: 'Number',
      render: (n) => (
        <button className="wa-reg__name" onClick={() => navigate(`/settings/whatsapp/numbers/${n.id}`)}>
          <strong>{n.displayName}</strong>
          <span>{n.displayNumber}{n.department ? ` · ${n.department}` : ''}</span>
        </button>
      ),
    },
    { key: 'status', header: 'Connection', render: (n) => <Badge tone={STATUS_TONE[n.connectionStatus] ?? 'neutral'}>{n.connectionStatus}</Badge> },
    { key: 'quality', header: 'Quality', render: (n) => <Badge tone={QUALITY_TONE[n.qualityRating] ?? 'neutral'}>{QUALITY_LABEL[n.qualityRating] ?? n.qualityRating}</Badge> },
    { key: 'tier', header: 'Messaging tier', render: (n) => n.messagingLimit },
    {
      key: 'verify', header: 'Verification',
      render: (n) => n.codeVerificationStatus
        ? <Badge tone={VERIFY_TONE[n.codeVerificationStatus] ?? 'neutral'}>{n.codeVerificationStatus.replace(/_/g, ' ').toLowerCase()}</Badge>
        : <span className="wa-reg__muted">—</span>,
    },
    { key: 'actions', header: '', render: (n) => <Button variant="secondary" size="sm" onClick={() => navigate(`/settings/whatsapp/numbers/${n.id}`)}>View</Button> },
  ];

  return (
    <div className="wa-reg">
      <PageHeader
        title="WhatsApp numbers"
        description="Every number connected to this workspace, its quality and its mapping."
        actions={<Button variant="primary" iconLeft={<Plus />} onClick={() => { window.location.href = '/onboarding'; }}>Connect a number</Button>}
      />

      {rows.length > 0 && (
        <div className="wa-reg__banner">
          <span><strong>{rows.length}</strong> number{rows.length !== 1 ? 's' : ''} connected</span>
          <span>Shared messaging tier: <strong>{sharedTier}</strong> <em>(portfolio-level — shared across all numbers)</em></span>
        </div>
      )}

      {rows.length === 0
        ? <EmptyState title="No numbers connected" description="Connect a WhatsApp Business number to start messaging."
            actions={<Button variant="primary" onClick={() => { window.location.href = '/onboarding'; }}>Connect a number</Button>} />
        : <DataTable caption="WhatsApp numbers" columns={columns} rows={rows} rowKey={(n) => n.id} />}
    </div>
  );
}
