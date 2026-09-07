import { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Circle, Lock, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDashboardHref } from '../dashboard-links';
import type { SetupStep } from '@crm/mock-data';

export interface SetupChecklistBarProps {
  steps: SetupStep[];
  percent: number;
}

/**
 * Compact, collapsible, dismissible setup checklist. Shows only the number of
 * pending steps by default, expands on demand, can be hidden (`?setup=hidden`),
 * and is not rendered at all once setup is complete — so it never permanently
 * occupies dashboard space.
 */
export function SetupChecklistBar({ steps, percent }: SetupChecklistBarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const dashHref = useDashboardHref();
  const [expanded, setExpanded] = useState(false);

  const pending = steps.filter((step) => step.status !== 'complete');
  const hidden = searchParams.get('setup') === 'hidden';

  // Auto-removed after completion or when the user hides it.
  if (percent >= 100 || pending.length === 0 || hidden) return null;

  const hide = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('setup', 'hidden');
      return next;
    });

  return (
    <div className="crm-setup-bar">
      <button
        className="crm-setup-bar__summary"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {expanded ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
        <span className="crm-setup-bar__title">Finish setting up</span>
        <span className="crm-setup-bar__count">{pending.length} steps left</span>
        <span className="crm-setup-bar__progress" aria-hidden="true">
          <span className="crm-setup-bar__progress-fill" style={{ width: `${percent}%` }} />
        </span>
        <span className="crm-setup-bar__percent">{percent}%</span>
      </button>
      <button className="crm-setup-bar__hide" aria-label="Hide setup checklist" onClick={hide}>
        <X aria-hidden="true" />
      </button>

      {expanded ? (
        <ul className="crm-setup-bar__list">
          {steps.map((step) => {
            const Icon = step.status === 'complete' ? CheckCircle2 : step.status === 'blocked' ? Lock : Circle;
            return (
              <li key={step.id} className={`crm-setup-bar__step crm-setup-bar__step--${step.status}`}>
                <Icon className="crm-setup-bar__step-icon" aria-hidden="true" />
                <button
                  className="crm-setup-bar__step-label"
                  disabled={step.status === 'complete' || step.status === 'blocked'}
                  title={step.blockedReason}
                  onClick={() => step.to && navigate(dashHref(step.to))}
                >
                  {step.label}
                  {step.status === 'blocked' && step.blockedReason ? (
                    <span className="crm-setup-bar__blocked"> — {step.blockedReason}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
