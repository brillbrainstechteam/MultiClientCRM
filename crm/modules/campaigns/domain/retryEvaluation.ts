import { findContact } from '@crm/mock-data';
import type { RecipientRecord } from './types';

/**
 * Retry eligibility (SKILL.md §Retry failed). Never blindly resend permanent
 * failures, and re-check current eligibility (e.g. an opt-out recorded since
 * the failure) rather than trusting the stale send-time state.
 */
export interface RetryEvaluation {
  failedTotal: number;
  permanentCount: number;
  retryableCount: number;
  currentlyIneligibleCount: number;
  eligibleIds: string[];
}

export function evaluateRetry(recipients: RecipientRecord[]): RetryEvaluation {
  const failed = recipients.filter((r) => r.status === 'failed');
  const permanent = failed.filter((r) => r.failureCategory === 'permanent');
  const retryable = failed.filter((r) => r.failureCategory === 'retryable');
  const ineligible = retryable.filter((r) => findContact(r.contactId)?.consent === 'opted-out');
  const eligible = retryable.filter((r) => findContact(r.contactId)?.consent !== 'opted-out');

  return {
    failedTotal: failed.length,
    permanentCount: permanent.length,
    retryableCount: retryable.length,
    currentlyIneligibleCount: ineligible.length,
    eligibleIds: eligible.map((r) => r.id),
  };
}
