import { useState } from 'react';
import { KeyRound, Phone, ShieldCheck } from 'lucide-react';
import { Badge, Banner, Button, Input } from '@crm/design-system';
import { StepFooter } from '../../components/StepFooter';
import { StepHeader } from '../../components/StepHeader';

export interface VerificationStepProps {
  state: 'required' | 'complete' | 'failed';
  onBack: () => void;
  onContinue: () => void;
  onMarkComplete: () => void;
  onContactSupport?: () => void;
  onRetry?: () => void;
}

const concepts = [
  { icon: Phone, label: 'Phone ownership verification', description: 'Confirms you control this number.' },
  { icon: ShieldCheck, label: 'Cloud API registration', description: "Registers the number on Meta's WhatsApp Business Platform." },
  { icon: KeyRound, label: 'Two-step verification PIN', description: 'Protects the number from being re-registered elsewhere.' },
];

/**
 * C13 — Verification. Conditional; the CRM does not assume it always owns
 * OTP (SKILL.md "Verification"). Keeps phone ownership, Cloud API
 * registration and the two-step PIN as distinct concepts.
 */
export function VerificationStep({ state, onBack, onContinue, onMarkComplete, onContactSupport, onRetry }: VerificationStepProps) {
  const [crmOtpMode, setCrmOtpMode] = useState(false);
  const [otp, setOtp] = useState('');

  return (
    <div>
      <StepHeader
        eyebrow="Stage 3 · Connect with Meta"
        title="Verification"
        description="This number needs to be verified before it can send and receive live messages."
      />

      <ul className="crm-verification-concepts">
        {concepts.map((concept) => (
          <li key={concept.label}>
            <concept.icon aria-hidden="true" />
            <div>
              <p>{concept.label}</p>
              <span>{concept.description}</span>
            </div>
          </li>
        ))}
      </ul>

      {state === 'complete' ? (
        <Banner tone="info" title="Verification complete" description="Meta has verified this number. You can continue." />
      ) : state === 'failed' ? (
        <Banner
          tone="danger"
          title="Verification failed"
          description="Meta could not verify this number. Check that the number can currently receive an SMS or voice call, then try again."
          actions={
            <>
              {onRetry ? (
                <Button variant="primary" onClick={onRetry}>
                  Try again
                </Button>
              ) : null}
              {onContactSupport ? (
                <Button variant="secondary" onClick={onContactSupport}>
                  Contact support
                </Button>
              ) : null}
            </>
          }
        />
      ) : crmOtpMode ? (
        <div className="crm-form-section">
          <span className="crm-form-section__title">Enter the code sent to this number</span>
          <Input label="Verification code" hideLabel placeholder="6-digit code" value={otp} onChange={(event) => setOtp(event.target.value)} />
          <Button variant="primary" disabled={otp.trim().length < 4} onClick={onMarkComplete}>
            Verify code
          </Button>
        </div>
      ) : (
        <div className="crm-form-section">
          <Badge tone="warning">Action needed</Badge>
          <p>Continue verification directly with Meta in the same secure window used earlier.</p>
          <div className="crm-verification-actions">
            <Button variant="primary" onClick={onMarkComplete}>
              Continue verification with Meta
            </Button>
            <Button variant="ghost" onClick={() => setCrmOtpMode(true)}>
              Verify by code instead
            </Button>
          </div>
        </div>
      )}

      <StepFooter
        onBack={onBack}
        onContinue={state === 'complete' ? onContinue : undefined}
        continueLabel="Continue"
        note={state === 'complete' ? undefined : 'Verification must complete before continuing.'}
      />
    </div>
  );
}
