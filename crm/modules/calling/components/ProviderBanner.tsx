import type { ReactNode } from 'react';
import { Banner } from '@crm/design-system';

/**
 * Provider-absent banner (SKILL.md "Manual calling first"). Informational
 * only — never blocks the manual calling path underneath it. `actions` is
 * used by callers that know the acting role to offer a Settings handoff to
 * whoever can configure the provider (SKILL.md "Calling → Settings").
 */
export function ProviderDisconnectedBanner({ description, actions }: { description?: string; actions?: ReactNode }) {
  return (
    <Banner
      tone="info"
      title="No telephony provider connected for this line"
      description={
        description ??
        'Call Manually and log the outcome — provider click-to-call is not required.'
      }
      actions={actions}
    />
  );
}

export function ProviderFailureBanner() {
  return (
    <Banner
      tone="warning"
      title="The provider call failed to connect"
      description="Fall back to Call Manually / Copy Number and log the outcome yourself."
    />
  );
}
