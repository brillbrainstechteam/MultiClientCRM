import type { ReactNode } from 'react';
import { Button, ErrorState, LoadingSkeleton } from '@crm/design-system';

/**
 * Shared renderer for representative system states driven by `?state=`
 * (contacts precedent). Screens call this for their content area and fall
 * through to the real body when it returns null.
 *
 *   ?state=loading   ?state=error
 */
export function contentStateView(
  state: string | null,
  options: { onRetry?: () => void } = {},
): ReactNode | null {
  if (state === 'loading') {
    return (
      <div className="crm-state-loading">
        <LoadingSkeleton height={72} />
        <LoadingSkeleton lines={2} />
        <LoadingSkeleton height={220} />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <ErrorState
        title="Couldn't load this view"
        description="Something went wrong fetching the data. This is usually temporary — try again."
        actions={
          options.onRetry ? (
            <Button variant="secondary" onClick={options.onRetry}>
              Retry
            </Button>
          ) : undefined
        }
      />
    );
  }

  return null;
}
