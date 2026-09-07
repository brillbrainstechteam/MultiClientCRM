import { ExternalLink, ShieldCheck } from 'lucide-react';
import { Banner } from '@crm/design-system';
import type { MetaReturnState } from '@crm/mock-data';
import { StepFooter } from '../../components/StepFooter';
import { StepHeader } from '../../components/StepHeader';

export interface MetaExternalStepProps {
  onBack: () => void;
  onReturn: (state: MetaReturnState) => void;
}

const simulateOptions: { state: MetaReturnState; label: string; description: string }[] = [
  { state: 'completed', label: 'Complete signup', description: 'Meta returns the connected business, WABA and number.' },
  { state: 'cancelled', label: 'Cancel and close', description: 'You close the Meta window before finishing.' },
  { state: 'permission_missing', label: 'Missing permission', description: 'Meta returns without granting business management access.' },
  { state: 'error', label: 'Generic error', description: 'Meta reports an unexpected error during signup.' },
];

/**
 * Meta external placeholder — the CRM never reproduces Meta's Embedded
 * Signup UI (SKILL.md "Connect with Meta"). In this prototype, the "secure
 * window" is simulated with deterministic return-state buttons.
 */
export function MetaExternalStep({ onBack, onReturn }: MetaExternalStepProps) {
  return (
    <div>
      <StepHeader
        eyebrow="Stage 3 · Connect with Meta"
        title="Meta will open in a secure window"
        description="You'll sign in with your Meta Business account and choose which business, WhatsApp account and number to share with this CRM."
      />

      <div className="crm-meta-external">
        <ShieldCheck aria-hidden="true" />
        <p>This step is hosted entirely by Meta. The CRM only reads the result once you return.</p>
      </div>

      <Banner
        tone="info"
        title="Prototype limitation"
        description="Real Embedded Signup is not implemented here. Choose one of the outcomes below to preview how the CRM handles each case."
      />

      <div className="crm-meta-external__simulate">
        {simulateOptions.map((option) => (
          <button key={option.state} type="button" className="crm-meta-external__option" onClick={() => onReturn(option.state)}>
            <span className="crm-meta-external__option-title">
              <ExternalLink aria-hidden="true" />
              {option.label}
            </span>
            <span className="crm-meta-external__option-description">{option.description}</span>
          </button>
        ))}
      </div>

      <StepFooter onBack={onBack} note="Nothing is saved on Meta's side until you complete signup." />
    </div>
  );
}
