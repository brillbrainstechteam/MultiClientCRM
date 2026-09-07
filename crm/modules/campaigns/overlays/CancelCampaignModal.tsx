import { useState } from 'react';
import { Button, Modal, Textarea } from '@crm/design-system';

/** CAM-M03 — Cancel Scheduled Campaign. Only available before execution starts. */
export function CancelCampaignModal({
  open,
  campaignName,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  campaignName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');

  return (
    <Modal
      open={open}
      title="Cancel scheduled campaign?"
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>Keep scheduled</Button>
          <Button variant="danger" onClick={() => onConfirm(reason.trim() || 'Cancelled before send.')}>
            Cancel campaign
          </Button>
        </>
      }
    >
      <p>
        <strong>{campaignName}</strong> will not be sent. This cannot be undone — you would need to duplicate it to send
        again.
      </p>
      <Textarea label="Reason (optional)" placeholder="Why is this being cancelled?" value={reason} onChange={(e) => setReason(e.target.value)} />
    </Modal>
  );
}
