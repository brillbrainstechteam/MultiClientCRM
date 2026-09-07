import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { Modal, Button } from '@crm/design-system';

interface SpamModalProps {
  open: boolean;
  mode: 'mark' | 'remove';
  onClose: () => void;
  onConfirm: () => void;
}

export function SpamModal({ open, mode, onClose, onConfirm }: SpamModalProps) {
  const isMarking = mode === 'mark';

  return (
    <Modal
      open={open}
      title={isMarking ? 'Mark as Spam?' : 'Remove Spam Flag?'}
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Icon + description */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isMarking ? 'var(--crm-danger-tint)' : 'var(--crm-green-tint)',
            color: isMarking ? 'var(--crm-danger)' : 'var(--crm-success)',
          }}>
            {isMarking ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--crm-text-primary)', marginBottom: 6 }}>
              {isMarking ? 'Mark this conversation as spam?' : 'Remove the spam flag from this conversation?'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--crm-text-secondary)', lineHeight: 1.5 }}>
              {isMarking
                ? 'The conversation will be moved to the Spam queue. Normal actions will be restricted and the contact will be flagged. This does not automatically block the contact — that is managed separately in Contacts.'
                : 'The conversation will return to the normal Inbox. The contact will no longer be flagged from this conversation.'}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant={isMarking ? 'danger' : 'primary'}
            size="sm"
            onClick={() => { onConfirm(); onClose(); }}
          >
            {isMarking ? 'Mark as Spam' : 'Remove Spam Flag'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
