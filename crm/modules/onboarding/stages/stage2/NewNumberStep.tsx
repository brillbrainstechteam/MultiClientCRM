import { useState } from 'react';
import { Input, Select, Toggle } from '@crm/design-system';
import { branches, teams } from '@crm/mock-data';
import { StepFooter } from '../../components/StepFooter';
import { StepHeader } from '../../components/StepHeader';

export interface NewNumberStepProps {
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
 * C09 — New Number. Only purpose, business/location, handling team, whether
 * the old customer-facing number stays active, and an optional transition
 * owner. Never asks an ordinary user to understand or create a WABA.
 */
export function NewNumberStep({ onBack, onContinue }: NewNumberStepProps) {
  const [purpose, setPurpose] = useState('sales');
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '');
  const [teamId, setTeamId] = useState(teams[0]?.id ?? '');
  const [oldNumberActive, setOldNumberActive] = useState(true);
  const [transitionOwner, setTransitionOwner] = useState('');

  return (
    <div>
      <StepHeader
        eyebrow="Stage 2 · Best Connection Option"
        title="A few details about the new number"
        description="No technical setup needed on your side — we handle the WhatsApp Business Platform configuration."
      />

      <div className="crm-form-grid">
        <Select label="Purpose" options={purposeOptions} value={purpose} onChange={(event) => setPurpose(event.target.value)} />
        <Select
          label="Business / location"
          options={branches.map((branch) => ({ value: branch.id, label: branch.name }))}
          value={branchId}
          onChange={(event) => setBranchId(event.target.value)}
        />
        <Select
          label="Handling team"
          options={teams.map((team) => ({ value: team.id, label: team.name }))}
          value={teamId}
          onChange={(event) => setTeamId(event.target.value)}
        />
        <Input
          label="Transition owner (optional)"
          placeholder="Who to contact about the switch-over"
          value={transitionOwner}
          onChange={(event) => setTransitionOwner(event.target.value)}
        />
      </div>

      <div className="crm-form-checkbox-row">
        <Toggle
          label="Our old customer-facing number stays active"
          description="Customers may still message the old number for a while — helpful context for your team."
          checked={oldNumberActive}
          onChange={setOldNumberActive}
        />
      </div>

      <StepFooter onBack={onBack} onContinue={onContinue} continueLabel="Continue to Meta" />
    </div>
  );
}
