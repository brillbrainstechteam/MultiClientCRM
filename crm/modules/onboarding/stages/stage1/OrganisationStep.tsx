import { useState } from 'react';
import { Select } from '@crm/design-system';
import { ChoiceCard } from '../../components/ChoiceCard';
import { StepFooter } from '../../components/StepFooter';
import { StepHeader } from '../../components/StepHeader';

export interface OrganisationStepProps {
  onBack: () => void;
  onContinue: () => void;
}

type OrgChoice = 'main' | 'add-unit';

const departmentPresets = [
  { value: 'none', label: 'No preset — I will configure later' },
  { value: 'sales-support', label: 'Sales & Support' },
  { value: 'sales-service-billing', label: 'Sales, Service & Billing' },
];

/**
 * C03 — Organisation setup. Optional by design (SKILL.md "Organisation
 * setup"): default is a single "Main Business" and skipping this step still
 * creates one automatically. Deep hierarchy stays editable later in Settings.
 */
export function OrganisationStep({ onBack, onContinue }: OrganisationStepProps) {
  const [choice, setChoice] = useState<OrgChoice>('main');
  const [preset, setPreset] = useState('none');

  return (
    <div>
      <StepHeader
        eyebrow="Stage 1 · Your Number"
        title="Organisation (optional)"
        description="Most businesses can skip this — we create a single Main Business automatically. Add a location or business unit only if you already operate more than one."
      />

      <div className="crm-choice-list" role="radiogroup" aria-label="Organisation setup">
        <ChoiceCard
          title="Use Main Business"
          description="One business, one record. You can always add locations later in Settings → Organisation."
          selected={choice === 'main'}
          onSelect={() => setChoice('main')}
        />
        <ChoiceCard
          title="Add a location / business unit now"
          description="Useful if this number serves a specific branch, city or unit."
          selected={choice === 'add-unit'}
          onSelect={() => setChoice('add-unit')}
        />
      </div>

      {choice === 'add-unit' ? (
        <div className="crm-form-section">
          <span className="crm-form-section__title">Common department preset</span>
          <p className="crm-form-section__hint">
            Optional — creates starter departments you can rename or remove later.
          </p>
          <Select
            label="Department preset"
            hideLabel
            options={departmentPresets}
            value={preset}
            onChange={(event) => setPreset(event.target.value)}
          />
        </div>
      ) : null}

      <StepFooter onBack={onBack} onContinue={onContinue} continueLabel="Continue" />
    </div>
  );
}
