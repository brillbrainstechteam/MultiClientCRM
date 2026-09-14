import { CircleCheck, CircleX } from 'lucide-react';
import { Button, Modal } from '@crm/design-system';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending Meta review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PAUSED: 'Paused',
  DISABLED: 'Disabled',
};

/** TPL-S08 — Submission Outcome. Shows Meta's real response, not a simulation. */
export function SubmissionOutcomeModal({
  open,
  result,
  templateName,
  metaReference,
  metaStatus,
  errorDetail,
  onViewTemplate,
  onBackToTemplates,
  onRetry,
  onEditTemplate,
}: {
  open: boolean;
  result: 'success' | 'failure';
  templateName: string;
  metaReference: string;
  metaStatus?: string;
  errorDetail?: string;
  onViewTemplate: () => void;
  onBackToTemplates: () => void;
  onRetry: () => void;
  onEditTemplate: () => void;
}) {
  if (!open) return null;

  if (result === 'success') {
    const statusLabel = STATUS_LABEL[(metaStatus ?? 'PENDING').toUpperCase()] ?? metaStatus ?? 'Pending Meta review';
    return (
      <Modal
        open
        title="Submitted to Meta"
        onClose={onBackToTemplates}
        footer={
          <>
            <Button variant="secondary" onClick={onBackToTemplates}>Back to Templates</Button>
            <Button variant="primary" onClick={onViewTemplate}>View Template</Button>
          </>
        }
      >
        <div className="crm-submission-outcome">
          <CircleCheck aria-hidden="true" className="crm-submission-outcome__icon crm-submission-outcome__icon--success" />
          <p>
            <strong>{templateName}</strong> was submitted to Meta. Status: <strong>{statusLabel}</strong>.
          </p>
          <dl className="crm-submission-outcome__meta">
            <div><dt>Submitted</dt><dd>{new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</dd></div>
            <div><dt>Meta template ID</dt><dd>{metaReference || '—'}</dd></div>
          </dl>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      title="Submission failed"
      onClose={onEditTemplate}
      footer={
        <>
          <Button variant="secondary" onClick={onEditTemplate}>Edit Template</Button>
          <Button variant="primary" onClick={onRetry}>Retry</Button>
        </>
      }
    >
      <div className="crm-submission-outcome">
        <CircleX aria-hidden="true" className="crm-submission-outcome__icon crm-submission-outcome__icon--failure" />
        <p>We could not submit <strong>{templateName}</strong> to Meta. Your draft is kept — nothing was lost.</p>
        {errorDetail ? (
          <p>
            <strong>Reason:</strong> {errorDetail}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
