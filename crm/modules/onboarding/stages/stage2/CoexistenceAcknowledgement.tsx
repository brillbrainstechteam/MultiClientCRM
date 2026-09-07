import { useState } from 'react';
import { Banner, Checkbox } from '@crm/design-system';
import { StepFooter } from '../../components/StepFooter';
import { StepHeader } from '../../components/StepHeader';
import { coexistenceAppearsInCrm, coexistenceLimitations, coexistenceStaysInApp } from './coexistence-config';

export interface CoexistenceAcknowledgementProps {
  onBack: () => void;
  onContinue: () => void;
}

/** C07 — Coexistence acknowledgement. Short and specific, not a legal wall of text. */
export function CoexistenceAcknowledgement({ onBack, onContinue }: CoexistenceAcknowledgementProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div>
      <StepHeader
        eyebrow="Stage 2 · Best Connection Option"
        title="Before you continue with Coexistence"
        description="Quick summary of what stays where — this is the only acknowledgement needed."
      />

      <div className="crm-coexistence-grid">
        <section>
          <h3>Stays in the Business App</h3>
          <ul>
            {coexistenceStaysInApp.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3>Appears in the CRM</h3>
          <ul>
            {coexistenceAppearsInCrm.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <Banner
        tone="warning"
        title="Duplicate-reply risk"
        description="If someone replies from the Business App and an agent replies from the CRM at the same time, the customer may receive two answers. The CRM is the system of record for assignment and follow-up — encourage your team to reply from there."
      />

      <div className="crm-form-section">
        <h3>Current limitations</h3>
        <ul>
          {coexistenceLimitations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="crm-form-checkbox-row">
        <Checkbox
          label="I understand how Coexistence works and accept the duplicate-reply risk above."
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
        />
      </div>

      <StepFooter onBack={onBack} onContinue={onContinue} continueDisabled={!acknowledged} continueLabel="Continue to Meta" />
    </div>
  );
}
