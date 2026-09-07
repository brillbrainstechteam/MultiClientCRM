import { Button, Modal } from '@crm/design-system';

/** CAM-M04 — Pause / Resume Confirmation. Only shown when the capability resolver allows it for this role/status. */
export function PauseResumeModal({
  open,
  direction,
  campaignName,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  direction: 'pause' | 'resume';
  campaignName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      title={direction === 'pause' ? 'Pause this campaign?' : 'Resume this campaign?'}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={onConfirm}>
            {direction === 'pause' ? 'Pause sending' : 'Resume sending'}
          </Button>
        </>
      }
    >
      <p>
        {direction === 'pause' ? (
          <>
            <strong>{campaignName}</strong> will stop sending to any recipient not yet processed. Already-sent messages
            are not affected. You can resume from where it left off at any time.
          </>
        ) : (
          <>
            <strong>{campaignName}</strong> will continue sending to remaining recipients. Eligibility for anyone still
            pending is re-checked before resuming.
          </>
        )}
      </p>
    </Modal>
  );
}
