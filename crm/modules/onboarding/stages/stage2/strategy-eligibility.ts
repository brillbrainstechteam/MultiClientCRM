import type { ConnectionStrategy, NumberUsageToday } from '@crm/mock-data';

export interface StrategyOption {
  id: ConnectionStrategy;
  title: string;
  benefit: string;
  operatingChange: string;
  eligible: boolean;
  eligibilityNote: string;
  historyExpectation: string;
  transitionNote?: string;
}

export interface StrategyEligibility {
  recommended: ConnectionStrategy | null;
  requiresConfirmation: boolean;
  options: StrategyOption[];
}

/**
 * Deterministic eligibility fixture (SKILL.md "Connection Strategy" — "do not
 * promise Coexistence before eligibility is confirmed"). `forceUnavailable`
 * reproduces the C05 "coexistence unavailable" capture state on demand.
 */
export function resolveStrategyEligibility(
  usageToday: NumberUsageToday,
  forceUnavailable = false,
): StrategyEligibility {
  const coexistenceEligible = usageToday === 'business_app' && !forceUnavailable;

  const options: StrategyOption[] = [
    {
      id: 'coexistence',
      title: 'Keep Business App + CRM (Coexistence)',
      benefit: 'Keep using the free WhatsApp Business App on your phone while the CRM also sends and receives.',
      operatingChange: 'Both the app and the CRM stay active on the same number. No downtime.',
      eligible: coexistenceEligible,
      eligibilityNote: coexistenceEligible
        ? 'Eligible for this number.'
        : forceUnavailable
          ? 'Not available for this number right now — Meta has not enabled Coexistence for this account.'
          : 'Only available for numbers currently used with the WhatsApp Business App.',
      historyExpectation: 'Chat history stays on your phone; the CRM starts fresh unless you import a reference copy.',
    },
    {
      id: 'migrate_business_app',
      title: 'Move Business App number to WhatsApp Business Platform',
      benefit: 'Full CRM control: team inboxes, automation and campaigns on this number.',
      operatingChange: 'The WhatsApp Business App on your phone stops working for this number once migrated.',
      eligible: usageToday === 'business_app',
      eligibilityNote:
        usageToday === 'business_app'
          ? 'Eligible for this number.'
          : 'Only applies to numbers currently on the WhatsApp Business App.',
      historyExpectation: 'Existing app chat history does not transfer automatically — optional manual/reference import only.',
      transitionNote: 'Brief downtime possible during the switch (typically minutes, not hours).',
    },
    {
      id: 'migrate_provider',
      title: 'Migrate an existing API / provider number',
      benefit: 'Bring a number already on another BSP or WhatsApp API over to this CRM.',
      operatingChange: 'The previous provider integration is deregistered once migration completes.',
      eligible: usageToday === 'existing_provider',
      eligibilityNote:
        usageToday === 'existing_provider'
          ? 'Eligible — requires confirmation from your current provider.'
          : 'Only applies to numbers already connected through another API/provider.',
      historyExpectation: 'History does not transfer automatically; your previous provider may offer an export.',
      transitionNote: 'Coordinated cutover with your current provider avoids message loss.',
    },
    {
      id: 'new_number',
      title: 'Connect a new number',
      benefit: 'Start clean on a number not previously used for customer WhatsApp messaging.',
      operatingChange: 'No prior WhatsApp history to reconcile — simplest and fastest path.',
      eligible: true,
      eligibilityNote: 'Always available.',
      historyExpectation: 'No prior WhatsApp history applies.',
    },
  ];

  const requiresConfirmation = usageToday === 'not_sure';
  const recommended: ConnectionStrategy | null = requiresConfirmation
    ? null
    : usageToday === 'business_app'
      ? (coexistenceEligible ? 'coexistence' : 'migrate_business_app')
      : usageToday === 'existing_provider'
        ? 'migrate_provider'
        : 'new_number';

  return { recommended, requiresConfirmation, options };
}
