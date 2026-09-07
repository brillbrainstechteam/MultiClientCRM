import { Check, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Button } from '@crm/design-system';
import type { SetupStep } from '@crm/mock-data';

export interface SetupChecklistWidgetProps {
  steps: SetupStep[];
  percent: number;
}

/**
 * DASH-S01 §7 row 4 — Setup Checklist. Visible prominently only while
 * incomplete (OverviewScreen decides whether to render this at all); collapses
 * in prominence once every step is complete.
 */
export function SetupChecklistWidget({ steps, percent }: SetupChecklistWidgetProps) {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const nextStep = steps.find((step) => step.status === 'incomplete');

  return (
    <div className="crm-setup-widget">
      <div className="crm-setup-widget__head">
        <div>
          <h2 className="crm-dash-section-title">Finish setting up your workspace</h2>
          <p className="crm-setup-widget__meta">{percent}% complete</p>
        </div>
        {nextStep ? (
          <Button variant="primary" size="sm" onClick={() => navigate(scopedHref(nextStep.to))}>
            Continue setup
          </Button>
        ) : null}
      </div>

      <div className="crm-setup-widget__bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <span className="crm-setup-widget__bar-fill" style={{ width: `${percent}%` }} />
      </div>

      <ol className="crm-setup-widget__steps">
        {steps.map((step) => (
          <li key={step.id} className={`crm-setup-widget__step crm-setup-widget__step--${step.status}`}>
            <span className="crm-setup-widget__step-marker" aria-hidden="true">
              {step.status === 'complete' ? <Check /> : step.status === 'blocked' ? <Lock /> : null}
            </span>
            {step.status === 'incomplete' ? (
              <button
                type="button"
                className="crm-setup-widget__step-link"
                onClick={() => navigate(scopedHref(step.to))}
              >
                {step.label}
              </button>
            ) : (
              <span className="crm-setup-widget__step-label">{step.label}</span>
            )}
            {step.blockedReason ? (
              <span className="crm-setup-widget__step-reason">{step.blockedReason}</span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
