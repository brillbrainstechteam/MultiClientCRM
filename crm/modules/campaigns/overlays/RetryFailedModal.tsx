import { Banner, Button, Modal } from '@crm/design-system';
import { evaluateRetry } from '../domain/retryEvaluation';
import type { Campaign } from '../domain/types';

/**
 * CAM-M08 — Retry Failed Recipients. Distinguishes retryable from permanent
 * failures and re-checks current eligibility (e.g. an opt-out recorded since
 * the failure) — never a blind resend of everything marked "failed"
 * (SKILL.md §Retry failed).
 */
export function RetryFailedModal({
  open,
  campaign,
  onClose,
  onConfirm,
}: {
  open: boolean;
  campaign: Campaign;
  onClose: () => void;
  onConfirm: (retryRecipientIds: string[]) => void;
}) {
  const evaluation = evaluateRetry(campaign.recipients);
  const retryCount = evaluation.eligibleIds.length;

  return (
    <Modal
      open={open}
      title="Retry failed recipients"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={retryCount === 0} onClick={() => onConfirm(evaluation.eligibleIds)}>
            Retry {retryCount > 0 ? `${retryCount} recipient(s)` : ''}
          </Button>
        </>
      }
    >
      <div className="crm-camp-retry-modal">
        <ul className="crm-camp-retry-modal__stats">
          <li>
            <span>Failed</span>
            <span>{evaluation.failedTotal.toLocaleString('en-IN')}</span>
          </li>
          <li>
            <span>Retryable</span>
            <span>{evaluation.retryableCount.toLocaleString('en-IN')}</span>
          </li>
          <li>
            <span>Currently ineligible</span>
            <span>{evaluation.currentlyIneligibleCount.toLocaleString('en-IN')}</span>
          </li>
        </ul>

        {evaluation.permanentCount > 0 ? (
          <Banner
            tone="info"
            title={`${evaluation.permanentCount} permanent failure(s) will not be retried`}
            description="Invalid numbers and recipient-blocked messages cannot be recovered by retrying."
          />
        ) : null}

        {evaluation.currentlyIneligibleCount > 0 ? (
          <Banner
            tone="warning"
            title={`${evaluation.currentlyIneligibleCount} recipient(s) are no longer eligible`}
            description="They opted out since this campaign was sent, so they will be skipped even though the original failure was retryable."
          />
        ) : null}

        {retryCount === 0 && evaluation.failedTotal > 0 ? (
          <Banner tone="info" title="Nothing to retry" description="Every failed recipient is either a permanent failure or no longer eligible." />
        ) : null}

        <p className="crm-camp-retry-modal__note">
          Retrying re-queues these recipients for this campaign only — it does not create a duplicate send or affect any other campaign.
        </p>
      </div>
    </Modal>
  );
}
