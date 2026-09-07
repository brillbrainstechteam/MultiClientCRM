import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Badge, Button, Input, Modal } from '@crm/design-system';
import type { AutomationFlow, ValidationIssue } from '../domain/types';

export function PublishModal({
  open,
  flow,
  issues,
  onClose,
  onPublish,
  onSendForApproval,
  onOpenValidation,
}: {
  open: boolean;
  flow: AutomationFlow;
  issues: ValidationIssue[];
  onClose: () => void;
  onPublish: (options: { scheduledStart?: string | null; stopDate?: string | null }) => void;
  onSendForApproval: () => void;
  onOpenValidation: () => void;
}) {
  const [confirmedUntested, setConfirmedUntested] = useState(false);
  const [scheduledStart, setScheduledStart] = useState('');
  const [stopDate, setStopDate] = useState('');

  const errors = issues.filter((i) => i.severity === 'error');
  const isUntested = !flow.testedAt || flow.changedSinceTest;
  const blocked = errors.length > 0;
  const needsApproval = flow.requiresApproval && flow.approvalStage !== 'approved';

  const canConfirm = !blocked && (!isUntested || confirmedUntested);

  const handlePrimary = () => {
    if (blocked) return;
    if (needsApproval) {
      onSendForApproval();
      onClose();
      return;
    }
    onPublish({ scheduledStart: scheduledStart || null, stopDate: stopDate || null });
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Go Live"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handlePrimary} disabled={!canConfirm}>
            {needsApproval ? 'Send for Approval' : scheduledStart ? 'Schedule' : 'Go Live now'}
          </Button>
        </>
      }
    >
      <div className="crm-aut-publish">
        {blocked ? (
          <div className="crm-aut-publish__banner crm-aut-publish__banner--error">
            <AlertTriangle size={16} />
            <div>
              <p>{errors.length} error{errors.length === 1 ? '' : 's'} must be fixed before this flow can go live.</p>
              <Button variant="ghost" size="sm" onClick={onOpenValidation}>
                Open Validation
              </Button>
            </div>
          </div>
        ) : null}

        {!blocked && isUntested ? (
          <div className="crm-aut-publish__banner crm-aut-publish__banner--warning">
            <AlertTriangle size={16} />
            <div>
              <p>{flow.testedAt ? 'This flow changed since it was last tested.' : 'This flow has never been tested.'} Going live without testing can surprise real customers.</p>
              <label className="crm-aut-publish__confirm">
                <input type="checkbox" checked={confirmedUntested} onChange={(e) => setConfirmedUntested(e.target.checked)} />
                I understand and want to go live anyway
              </label>
            </div>
          </div>
        ) : null}

        {!blocked && needsApproval ? (
          <div className="crm-aut-publish__banner crm-aut-publish__banner--info">
            <Badge tone="info">Approval required</Badge>
            <p>This tenant requires manager approval before publishing. This will send the flow for approval instead of going live immediately.</p>
          </div>
        ) : null}

        {!blocked && !needsApproval ? (
          <div className="crm-aut-publish__schedule">
            <Input label="Scheduled start (optional)" type="datetime-local" value={scheduledStart} onChange={(e) => setScheduledStart(e.target.value)} />
            <Input label="Stop date (optional)" type="date" value={stopDate} onChange={(e) => setStopDate(e.target.value)} />
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
