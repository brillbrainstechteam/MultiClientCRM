import { useState } from 'react';
import { CircleCheck, CircleX } from 'lucide-react';
import { Button, Modal } from '@crm/design-system';

/** TPL-S08 — Submission Outcome. Result modal/system state, not a permanent page. */
export function SubmissionOutcomeModal({
  open,
  result,
  templateName,
  metaReference,
  onViewTemplate,
  onBackToTemplates,
  onRetry,
  onEditTemplate,
}: {
  open: boolean;
  result: 'success' | 'failure';
  templateName: string;
  metaReference: string;
  onViewTemplate: () => void;
  onBackToTemplates: () => void;
  onRetry: () => void;
  onEditTemplate: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  if (!open) return null;

  if (result === 'success') {
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
            <strong>{templateName}</strong> was submitted successfully and is now <strong>Pending</strong> Meta review.
          </p>
          <dl className="crm-submission-outcome__meta">
            <div><dt>Submitted</dt><dd>{new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</dd></div>
            <div><dt>Meta reference</dt><dd>{metaReference}</dd></div>
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
        <button className="crm-submission-outcome__details-toggle" onClick={() => setShowDetails((v) => !v)}>
          {showDetails ? 'Hide technical details' : 'Show technical details'}
        </button>
        {showDetails ? (
          <pre className="crm-submission-outcome__details">
            {`error: meta_api_timeout\nrequest_id: req_${Date.now()}\nmessage: The Meta Graph API did not respond within the expected window.`}
          </pre>
        ) : null}
      </div>
    </Modal>
  );
}
