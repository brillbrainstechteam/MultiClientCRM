import { useState } from 'react';
import { Checkbox } from '@crm/design-system';
import { StepFooter } from '../../components/StepFooter';
import { StepHeader } from '../../components/StepHeader';

export interface MetaPreflightStepProps {
  onBack: () => void;
  onContinue: () => void;
}

const checks = [
  { id: 'account', label: 'I have an authorised Meta Business account to connect' },
  { id: 'access', label: 'I have admin access to the correct Meta Business Manager' },
  { id: 'verification', label: 'I can complete business verification with Meta if asked' },
];

/** C10 — Meta Preflight. Confirms prerequisites before opening the hosted Meta step. */
export function MetaPreflightStep({ onBack, onContinue }: MetaPreflightStepProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const allChecked = checks.every((check) => checked[check.id]);

  return (
    <div>
      <StepHeader
        eyebrow="Stage 3 · Connect with Meta"
        title="Before we open Meta"
        description="A quick check so the connection window goes smoothly — Meta owns the next screen, we just make sure you're ready for it."
      />

      <div className="crm-form-section">
        {checks.map((check) => (
          <Checkbox
            key={check.id}
            label={check.label}
            checked={Boolean(checked[check.id])}
            onChange={(event) => setChecked((prev) => ({ ...prev, [check.id]: event.target.checked }))}
          />
        ))}
      </div>

      <StepFooter onBack={onBack} onContinue={onContinue} continueDisabled={!allChecked} continueLabel="Continue to Meta" />
    </div>
  );
}
