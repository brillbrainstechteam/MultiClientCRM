import { X, UserCheck, CheckCircle2, Tag, CalendarDays, ShieldAlert } from 'lucide-react';
import { Button } from '@crm/design-system';
import type { InboxRoleCapabilities } from '../inbox-types';

interface BulkToolbarProps {
  selectedCount: number;
  policy: InboxRoleCapabilities;
  onClearSelection: () => void;
  onBulkAssign: () => void;
  onBulkResolve: () => void;
  onBulkLabels: () => void;
  onBulkFollowUp: () => void;
  onBulkSpam: () => void;
}

export function BulkToolbar({
  selectedCount,
  policy,
  onClearSelection,
  onBulkAssign,
  onBulkResolve,
  onBulkLabels,
  onBulkFollowUp,
  onBulkSpam,
}: BulkToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 20,
      background: 'var(--crm-bg-primary)',
      borderBottom: '1px solid var(--crm-border)',
      padding: '8px 12px',
      display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
    }}>
      {/* Count + clear */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--crm-text-primary)' }}>
          {selectedCount} selected
        </span>
        <button
          onClick={onClearSelection}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--crm-text-muted)', display: 'flex', alignItems: 'center' }}
          title="Clear selection"
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ flex: 1 }} />

      {/* Bulk actions */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {policy.canReassign && (
          <Button variant="secondary" size="sm" onClick={onBulkAssign}>
            <UserCheck size={12} style={{ marginRight: 3 }} />
            Assign
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={onBulkResolve}>
          <CheckCircle2 size={12} style={{ marginRight: 3 }} />
          Resolve
        </Button>
        <Button variant="secondary" size="sm" onClick={onBulkLabels}>
          <Tag size={12} style={{ marginRight: 3 }} />
          Labels
        </Button>
        <Button variant="secondary" size="sm" onClick={onBulkFollowUp}>
          <CalendarDays size={12} style={{ marginRight: 3 }} />
          Follow-up
        </Button>
        {policy.canMarkSpam && (
          <Button variant="secondary" size="sm" onClick={onBulkSpam}>
            <ShieldAlert size={12} style={{ marginRight: 3 }} />
            Spam
          </Button>
        )}
      </div>
    </div>
  );
}
