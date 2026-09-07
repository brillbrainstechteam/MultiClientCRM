import { Banner } from '@crm/design-system';
import { StepFooter } from '../../components/StepFooter';
import { StepHeader } from '../../components/StepHeader';

export interface MigrationStepProps {
  variant: 'business-app' | 'provider';
  onBack: () => void;
  onContinue: () => void;
}

const copy = {
  'business-app': {
    title: 'Move your Business App number to the Platform',
    description:
      'This number currently uses the free WhatsApp Business App. Moving it to the WhatsApp Business Platform gives the CRM full control — team inboxes, automation and campaigns.',
    steps: [
      'We ask Meta to move this number from the app to the Platform.',
      'The Business App on your phone stops working for this number once the move completes.',
      'Your CRM connection takes over sending and receiving.',
    ],
    downtime: 'Typically a few minutes of downtime while the move completes. Existing app chat history does not transfer automatically.',
  },
  provider: {
    title: 'Migrate this number from your current provider',
    description:
      'This number is already connected through another API or provider. We coordinate a cutover so the CRM becomes the new WhatsApp Business Platform connection.',
    steps: [
      'We confirm the number is eligible to move and request its release from the current provider.',
      'Once released, Meta re-registers the number under this CRM connection.',
      'Your previous provider integration is deregistered after cutover is confirmed.',
    ],
    downtime: 'Coordinated cutover minimizes message loss, but brief downtime is possible during the switch. History does not transfer automatically — check with your previous provider for an export.',
  },
} as const;

/** C08 — Migration. Business App→Platform and existing API/provider→new setup are distinct technical branches. */
export function MigrationStep({ variant, onBack, onContinue }: MigrationStepProps) {
  const content = copy[variant];

  return (
    <div>
      <StepHeader eyebrow="Stage 2 · Best Connection Option" title={content.title} description={content.description} />

      <div className="crm-form-section">
        <h3>What happens</h3>
        <ul>
          {content.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </div>

      <Banner tone="warning" title="Transition note" description={content.downtime} />

      <StepFooter onBack={onBack} onContinue={onContinue} continueLabel="Continue to Meta" />
    </div>
  );
}
