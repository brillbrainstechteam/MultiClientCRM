import { useState } from 'react';
import { useWorkspace } from '@crm/app/workspace-context';
import { Checkbox, Input, Select } from '@crm/design-system';
import { StepFooter } from '../../components/StepFooter';
import { StepHeader } from '../../components/StepHeader';

export interface BusinessBasicsStepProps {
  onBack: () => void;
  onContinue: () => void;
}

const purposeOptions = [
  { value: 'sales', label: 'Sales' },
  { value: 'support', label: 'Support' },
  { value: 'both', label: 'Sales & Support' },
  { value: 'other', label: 'Other' },
];

/**
 * C02 — Business & Number basics. Captures only what SKILL.md "Business &
 * Number" allows: business name, country/location, number, primary use and an
 * optional multi-location flag. No legal-entity, B2B/B2C or org-hierarchy
 * questions here.
 */
export function BusinessBasicsStep({ onBack, onContinue }: BusinessBasicsStepProps) {
  const { workspace } = useWorkspace();
  const [businessName, setBusinessName] = useState(workspace.legalName);
  const [country, setCountry] = useState('IN');
  const [number, setNumber] = useState('');
  const [purpose, setPurpose] = useState('sales');
  const [multiLocation, setMultiLocation] = useState(false);

  const canContinue = businessName.trim().length > 0 && number.trim().length >= 7;

  return (
    <div>
      <StepHeader
        eyebrow="Stage 1 · Your Number"
        title="Tell us about your business and number"
        description="We prefill what we already know about your account. This takes under a minute — no legal or organisation detail required yet."
      />

      <div className="crm-form-grid">
        <Input
          label="Business name"
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
          required
        />
        <Select
          label="Country / location"
          options={[
            { value: 'IN', label: 'India' },
            { value: 'AE', label: 'United Arab Emirates' },
            { value: 'US', label: 'United States' },
          ]}
          value={country}
          onChange={(event) => setCountry(event.target.value)}
        />
        <Input
          label="WhatsApp number"
          leadingAddon="+91"
          placeholder="98xxxxxxxx"
          value={number}
          onChange={(event) => setNumber(event.target.value)}
          hint="The number you want customers to message on WhatsApp."
          required
        />
        <Select
          label="Primary use"
          options={purposeOptions}
          value={purpose}
          onChange={(event) => setPurpose(event.target.value)}
        />
      </div>

      <div className="crm-form-checkbox-row">
        <Checkbox
          label="We operate from more than one location or branch"
          checked={multiLocation}
          onChange={(event) => setMultiLocation(event.target.checked)}
        />
      </div>

      <StepFooter
        onBack={onBack}
        onContinue={onContinue}
        continueDisabled={!canContinue}
        note="Progress is saved automatically as you go."
      />
    </div>
  );
}
