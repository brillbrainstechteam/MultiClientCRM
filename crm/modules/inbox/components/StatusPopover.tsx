import { useState } from 'react';
import { CheckCircle2, Clock, Archive, CalendarDays } from 'lucide-react';
import { Popover, Button } from '@crm/design-system';
import { users } from '@crm/mock-data';

interface StatusPopoverProps {
  open: boolean;
  currentStatus: 'open' | 'pending' | 'resolved';
  onClose: () => void;
  onChangeStatus: (status: 'open' | 'pending' | 'resolved', pendingReason?: string) => void;
  onScheduleFollowUp: (date: string, ownerId: string, note: string) => void;
}

const PENDING_REASONS = [
  'Awaiting customer response',
  'Waiting for more information',
  'Pending internal review',
  'Awaiting payment confirmation',
  'Customer requested callback',
];

const STATUS_CONFIG = {
  open: { label: 'Open', icon: <CheckCircle2 size={16} />, color: 'var(--crm-success)', bg: 'var(--crm-success-tint, #f0faf0)' },
  pending: { label: 'Pending', icon: <Clock size={16} />, color: 'var(--crm-warning)', bg: 'var(--crm-warning-tint, #fffbf0)' },
  resolved: { label: 'Resolved', icon: <Archive size={16} />, color: 'var(--crm-text-muted)', bg: 'var(--crm-bg-secondary)' },
} as const;

export function StatusPopover({ open, currentStatus, onClose, onChangeStatus, onScheduleFollowUp }: StatusPopoverProps) {
  const [pendingReason, setPendingReason] = useState('');
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpOwner, setFollowUpOwner] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [pendingTarget, setPendingTarget] = useState<'open' | 'pending' | 'resolved' | null>(null);

  function handleStatusClick(status: 'open' | 'pending' | 'resolved') {
    if (status === currentStatus) return;
    if (status === 'pending') {
      setPendingTarget('pending');
    } else if (status === 'resolved') {
      onChangeStatus('resolved');
      setPendingTarget('resolved');
      setShowFollowUp(true);
    } else {
      onChangeStatus('open');
      onClose();
    }
  }

  function confirmPending() {
    onChangeStatus('pending', pendingReason || PENDING_REASONS[0]);
    setPendingTarget(null);
    setPendingReason('');
    onClose();
  }

  function saveFollowUp() {
    if (followUpDate && followUpOwner) {
      onScheduleFollowUp(followUpDate, followUpOwner, followUpNote);
    }
    setShowFollowUp(false);
    setPendingTarget(null);
    onClose();
  }

  return (
    <Popover open={open} title="Conversation Status" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Status options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {(['open', 'pending', 'resolved'] as const).map((status) => {
            const cfg = STATUS_CONFIG[status];
            const isActive = status === currentStatus;
            return (
              <button
                key={status}
                onClick={() => handleStatusClick(status)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 8, cursor: isActive ? 'default' : 'pointer',
                  border: `1px solid ${isActive ? cfg.color : 'var(--crm-border)'}`,
                  background: isActive ? cfg.bg : 'transparent',
                  textAlign: 'left', width: '100%',
                  transition: 'all 0.15s',
                }}
                onMouseOver={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--crm-bg-secondary)';
                }}
                onMouseOut={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                <span style={{ color: cfg.color }}>{cfg.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--crm-text-primary)' }}>{cfg.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--crm-text-muted)' }}>
                    {status === 'open' && 'Active — agent is handling this conversation'}
                    {status === 'pending' && 'Waiting — paused pending some action or response'}
                    {status === 'resolved' && 'Closed — conversation is complete'}
                  </div>
                </div>
                {isActive && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: 0.5 }}>CURRENT</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Pending reason form */}
        {pendingTarget === 'pending' && (
          <div style={{ border: '1px solid var(--crm-warning)', borderRadius: 8, padding: 12, background: 'var(--crm-warning-tint, #fffbf0)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--crm-text-primary)', marginBottom: 8 }}>
              Why is this pending? (optional)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
              {PENDING_REASONS.map((reason) => (
                <label key={reason} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="pending-reason"
                    value={reason}
                    checked={pendingReason === reason}
                    onChange={() => setPendingReason(reason)}
                  />
                  <span style={{ fontSize: 12, color: 'var(--crm-text-secondary)' }}>{reason}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Button variant="secondary" size="sm" onClick={() => setPendingTarget(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={confirmPending}>Set Pending</Button>
            </div>
          </div>
        )}

        {/* Follow-up scheduler (shown after Resolved) */}
        {pendingTarget === 'resolved' && showFollowUp && (
          <div style={{ border: '1px solid var(--crm-border)', borderRadius: 8, padding: 12, background: 'var(--crm-bg-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <CalendarDays size={14} style={{ color: 'var(--crm-text-brand)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--crm-text-primary)' }}>
                Schedule a follow-up (optional)
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--crm-text-muted)', display: 'block', marginBottom: 3 }}>Follow-up date</label>
                <input
                  type="datetime-local"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '5px 8px',
                    border: '1px solid var(--crm-border)', borderRadius: 6, fontSize: 12,
                    background: 'var(--crm-bg-secondary)', color: 'var(--crm-text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--crm-text-muted)', display: 'block', marginBottom: 3 }}>Assign follow-up to</label>
                <select
                  value={followUpOwner}
                  onChange={(e) => setFollowUpOwner(e.target.value)}
                  style={{
                    width: '100%', padding: '5px 8px', border: '1px solid var(--crm-border)',
                    borderRadius: 6, fontSize: 12, background: 'var(--crm-bg-secondary)', color: 'var(--crm-text-primary)',
                  }}
                >
                  <option value="">Select agent…</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--crm-text-muted)', display: 'block', marginBottom: 3 }}>Note</label>
                <textarea
                  placeholder="Context for follow-up…"
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '5px 8px', resize: 'none',
                    border: '1px solid var(--crm-border)', borderRadius: 6, fontSize: 12,
                    background: 'var(--crm-bg-secondary)', color: 'var(--crm-text-primary)',
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <Button variant="secondary" size="sm" onClick={() => { setShowFollowUp(false); onClose(); }}>
                Skip & Close
              </Button>
              <Button variant="primary" size="sm" onClick={saveFollowUp} disabled={!followUpDate || !followUpOwner}>
                Save Follow-up
              </Button>
            </div>
          </div>
        )}
      </div>
    </Popover>
  );
}
