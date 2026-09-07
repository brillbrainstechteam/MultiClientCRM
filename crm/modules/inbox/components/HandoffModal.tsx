import { useState } from 'react';
import { Bot, Handshake } from 'lucide-react';
import { Modal, Button, Avatar } from '@crm/design-system';
import { users, teams } from '@crm/mock-data';

interface HandoffModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (assigneeId: string, teamId: string | null, reason: string, note: string) => void;
}

function nameInitials(name: string): string {
  return name.split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?';
}

const HANDOFF_REASONS = [
  'Customer requested human agent',
  'Complex query beyond bot capability',
  'Customer complaint requires human handling',
  'Technical support needed',
  'Purchase / order assistance',
  'VIP customer escalation',
];

export function HandoffModal({ open, onClose, onConfirm }: HandoffModalProps) {
  const [assigneeId, setAssigneeId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  function handleConfirm() {
    if (!assigneeId && !teamId) return;
    onConfirm(assigneeId, teamId || null, reason || HANDOFF_REASONS[0], note);
    resetForm();
    onClose();
  }

  function resetForm() {
    setAssigneeId('');
    setTeamId('');
    setReason('');
    setNote('');
  }

  const canConfirm = assigneeId || teamId;
  const selectedAgent = users.find((u) => u.id === assigneeId);

  const inputStyle = {
    width: '100%', boxSizing: 'border-box' as const, padding: '7px 10px',
    border: '1px solid var(--crm-border)', borderRadius: 6, fontSize: 13,
    background: 'var(--crm-bg-primary)', color: 'var(--crm-text-primary)',
  };

  return (
    <Modal open={open} title="Hand off to Human Agent" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Feature gate notice */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: '#ede9fe', borderRadius: 6, border: '1px solid #c4b5fd' }}>
          <Bot size={15} style={{ color: '#6366f1', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#4338ca' }}>
            Bot handoff is a Phase-2 feature. This screen is the handoff configuration — it will send the takeover request to the agent below.
          </span>
        </div>

        {/* Assign to team */}
        <div>
          <label style={{ fontSize: 11, color: 'var(--crm-text-muted)', display: 'block', marginBottom: 4 }}>Assign to team</label>
          <select value={teamId} onChange={(e) => { setTeamId(e.target.value); setAssigneeId(''); }} style={inputStyle}>
            <option value="">— Select team —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--crm-text-muted)' }}>— or assign to a specific agent —</div>

        {/* Assign to agent */}
        <div>
          <label style={{ fontSize: 11, color: 'var(--crm-text-muted)', display: 'block', marginBottom: 4 }}>Assign to agent</label>
          <select value={assigneeId} onChange={(e) => { setAssigneeId(e.target.value); setTeamId(''); }} style={inputStyle}>
            <option value="">— Select agent —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.roleLabel})</option>
            ))}
          </select>
        </div>

        {/* Selected agent preview */}
        {selectedAgent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--crm-bg-secondary)', borderRadius: 6 }}>
            <Avatar initials={nameInitials(selectedAgent.name)} name={selectedAgent.name} size="sm" />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--crm-text-primary)' }}>{selectedAgent.name}</div>
              <div style={{ fontSize: 11, color: 'var(--crm-text-muted)' }}>{selectedAgent.roleLabel}</div>
            </div>
          </div>
        )}

        {/* Reason */}
        <div>
          <label style={{ fontSize: 11, color: 'var(--crm-text-muted)', display: 'block', marginBottom: 4 }}>Reason for handoff</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)} style={inputStyle}>
            <option value="">— Select reason —</option>
            {HANDOFF_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Note */}
        <div>
          <label style={{ fontSize: 11, color: 'var(--crm-text-muted)', display: 'block', marginBottom: 4 }}>Context note for agent (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. Customer is asking about bulk discount for an upcoming festive order…"
            style={{ ...inputStyle, resize: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleConfirm} disabled={!canConfirm}>
            <Handshake size={13} style={{ marginRight: 4 }} />
            Confirm Handoff
          </Button>
        </div>
      </div>
    </Modal>
  );
}
