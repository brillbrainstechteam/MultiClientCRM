import { CircleCheck, TriangleAlert, UploadCloud } from 'lucide-react';
import { Badge, Button, WizardShell, type StepperItem } from '@crm/design-system';
import type { OnboardingNumberRecord } from '@crm/mock-data';

const STEPS: StepperItem[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'validate', label: 'Validate' },
  { id: 'map', label: 'Map' },
  { id: 'review', label: 'Review' },
  { id: 'result', label: 'Result' },
];

export interface ImportWizardProps {
  record: OnboardingNumberRecord;
  step: string;
  partial: boolean;
  onStepChange: (step: string | null) => void;
  onCancel: () => void;
  onComplete: () => void;
}

/** H02 — Import supported history wizard. Deterministic fixture data only (SKILL.md "Prototype limitations"). */
export function ImportWizard({ record, step, partial, onStepChange, onCancel, onComplete }: ImportWizardProps) {
  const currentId = STEPS.some((s) => s.id === step) ? step : 'upload';

  let body = null;
  let footer = (
    <>
      <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      <Button variant="primary" onClick={() => onStepChange('validate')}>Continue</Button>
    </>
  );

  if (currentId === 'upload') {
    body = (
      <div className="crm-import-wizard__dropzone">
        <UploadCloud aria-hidden="true" />
        <p>Choose a supported chat export file for {record.displayName}.</p>
        <Button variant="secondary" onClick={() => onStepChange('validate')}>
          Use demo export file — WhatsApp_Chat_Export.zip (1,240 messages)
        </Button>
      </div>
    );
    footer = (
      <>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" disabled>Continue</Button>
      </>
    );
  } else if (currentId === 'validate') {
    body = (
      <div className="crm-import-wizard__summary">
        <p><strong>1,240</strong> messages found in the export.</p>
        <ul>
          <li><CircleCheck aria-hidden="true" /> 1,190 messages ready to import</li>
          <li><TriangleAlert aria-hidden="true" /> 50 messages need review (unsupported media links)</li>
        </ul>
      </div>
    );
    footer = (
      <>
        <Button variant="secondary" onClick={() => onStepChange('upload')}>Back</Button>
        <Button variant="primary" onClick={() => onStepChange('map')}>Continue</Button>
      </>
    );
  } else if (currentId === 'map') {
    body = (
      <div className="crm-import-wizard__table">
        <div className="crm-import-wizard__table-row crm-import-wizard__table-row--head">
          <span>Export field</span>
          <span>Maps to</span>
        </div>
        <div className="crm-import-wizard__table-row">
          <span>Contact name</span>
          <span>Contact — Name</span>
        </div>
        <div className="crm-import-wizard__table-row">
          <span>Phone number</span>
          <span>Contact — WhatsApp number</span>
        </div>
        <div className="crm-import-wizard__table-row">
          <span>Message timestamp</span>
          <span>History — Sent at</span>
        </div>
      </div>
    );
    footer = (
      <>
        <Button variant="secondary" onClick={() => onStepChange('validate')}>Back</Button>
        <Button variant="primary" onClick={() => onStepChange('review')}>Continue</Button>
      </>
    );
  } else if (currentId === 'review') {
    body = (
      <div className="crm-import-wizard__summary">
        <p>Ready to import into <strong>{record.displayName}</strong>.</p>
        <ul>
          <li>1,190 messages will be added as historical reference</li>
          <li>50 messages will be skipped (unsupported media links)</li>
        </ul>
        <Badge tone="info">Imported history is visually marked as reference — not live Meta messages</Badge>
      </div>
    );
    footer = (
      <>
        <Button variant="secondary" onClick={() => onStepChange('map')}>Back</Button>
        <Button variant="primary" onClick={() => onStepChange('result')}>Import history</Button>
      </>
    );
  } else if (currentId === 'result') {
    body = partial ? (
      <div className="crm-import-wizard__result crm-import-wizard__result--partial">
        <TriangleAlert aria-hidden="true" />
        <h3>980 of 1,240 messages imported</h3>
        <p>260 messages were skipped — unsupported message type (voice notes). The rest are now available as history reference.</p>
      </div>
    ) : (
      <div className="crm-import-wizard__result crm-import-wizard__result--success">
        <CircleCheck aria-hidden="true" />
        <h3>1,190 messages imported</h3>
        <p>They're now available as history reference for {record.displayName}.</p>
      </div>
    );
    footer = (
      <Button variant="primary" onClick={onComplete}>Done</Button>
    );
  }

  return (
    <WizardShell
      title="Import supported history"
      subtitle={record.displayName}
      steps={STEPS}
      currentId={currentId}
      onCancel={onCancel}
      footer={footer}
    >
      {body}
    </WizardShell>
  );
}
