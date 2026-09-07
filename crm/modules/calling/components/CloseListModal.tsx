import { useState } from 'react';
import { Button, Modal } from '@crm/design-system';

export type CloseListAction = 'move-to-queue' | 'cancel-remaining';

export interface CloseListModalProps {
  open: boolean;
  remainingCount: number;
  onClose: () => void;
  onConfirm: (action: CloseListAction) => void;
}

/**
 * CALL-S09 close-list flow. Never silently discard remaining work (SKILL.md
 * "Call List completion" / SPEC "Close with pending work").
 */
export function CloseListModal({ open, remainingCount, onClose, onConfirm }: CloseListModalProps) {
  const [action, setAction] = useState<CloseListAction>('move-to-queue');

  return (
    <Modal
      open={open}
      title="Close this call list"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Keep list open
          </Button>
          <Button variant="danger" onClick={() => onConfirm(action)}>
            Close list
          </Button>
        </>
      }
    >
      <div className="crm-close-list">
        <p>
          {remainingCount} call{remainingCount === 1 ? '' : 's'} in this list {remainingCount === 1 ? 'has' : 'have'} not
          reached a terminal outcome yet. Choose what happens to that remaining work.
        </p>
        <label className="crm-close-list__option">
          <input
            type="radio"
            name="close-action"
            checked={action === 'move-to-queue'}
            onChange={() => setAction('move-to-queue')}
          />
          <span>
            <strong>Move remaining to queue</strong>
            <br />
            Remaining calls stay open and assigned, but are no longer tied to this list.
          </span>
        </label>
        <label className="crm-close-list__option">
          <input
            type="radio"
            name="close-action"
            checked={action === 'cancel-remaining'}
            onChange={() => setAction('cancel-remaining')}
          />
          <span>
            <strong>Cancel remaining calls</strong>
            <br />
            Remaining calls are marked cancelled and removed from active queues.
          </span>
        </label>
      </div>
    </Modal>
  );
}
