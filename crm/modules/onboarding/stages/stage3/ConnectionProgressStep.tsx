import { CircleAlert, CircleCheck, CircleDashed, LifeBuoy, TriangleAlert } from 'lucide-react';
import { Badge, Banner, Button } from '@crm/design-system';
import type { ConnectionProgressStep as ConnectionStep } from '@crm/mock-data';
import { StepFooter } from '../../components/StepFooter';
import { StepHeader } from '../../components/StepHeader';

export interface ConnectionProgressStepProps {
  steps: ConnectionStep[];
  onBack: () => void;
  onContinue: () => void;
  onGetHelp: (stepId: string) => void;
}

const statusIcon: Record<ConnectionStep['status'], typeof CircleCheck> = {
  complete: CircleCheck,
  in_progress: CircleDashed,
  warning: TriangleAlert,
  failed: CircleAlert,
  pending: CircleDashed,
};

/** C14 — Connection Setup Progress. Business-language steps + Technical Details accordion. */
export function ConnectionProgressStep({ steps, onBack, onContinue, onGetHelp }: ConnectionProgressStepProps) {
  const criticalDone = steps.filter((step) => step.critical).every((step) => step.status === 'complete');
  const failedStep = steps.find((step) => step.status === 'failed');

  return (
    <div>
      <StepHeader
        eyebrow="Stage 3 · Connect with Meta"
        title="Setting up your connection"
        description="We're confirming every piece needed for messages to flow both ways."
      />

      {failedStep ? (
        <Banner
          tone="danger"
          title={`${failedStep.label} needs attention`}
          description="Preserved progress on everything else — this one step is blocking Ready."
          actions={
            <Button variant="secondary" iconLeft={<LifeBuoy />} onClick={() => onGetHelp(failedStep.id)}>
              Get help
            </Button>
          }
        />
      ) : null}

      <ul className="crm-progress-list">
        {steps.map((step) => {
          const Icon = statusIcon[step.status];
          return (
            <li key={step.id} className={`crm-progress-list__item crm-progress-list__item--${step.status}`}>
              <Icon aria-hidden="true" />
              <span className="crm-progress-list__label">{step.label}</span>
              {!step.critical ? <Badge tone="neutral">Optional</Badge> : null}
              {step.status === 'failed' ? (
                <Button variant="ghost" size="sm" onClick={() => onGetHelp(step.id)}>
                  Get help
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>

      <details className="crm-review-advanced">
        <summary>Technical Details</summary>
        <ul className="crm-progress-technical">
          {steps.map((step) => (
            <li key={step.id}>
              <code>{step.id}</code>: {step.technical}
            </li>
          ))}
        </ul>
      </details>

      <StepFooter
        onBack={onBack}
        onContinue={onContinue}
        continueDisabled={!criticalDone}
        continueLabel="Continue to activation"
        note={criticalDone ? undefined : 'All critical checks must pass before continuing.'}
      />
    </div>
  );
}
