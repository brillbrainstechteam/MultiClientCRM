import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconButton } from './IconButton';
import { Stepper, type StepperItem } from './Stepper';

export interface WizardShellProps {
  title: string;
  subtitle?: string;
  steps: StepperItem[];
  currentId: string;
  /** Close/cancel affordance in the header. */
  onCancel: () => void;
  /** Back / Continue actions. */
  footer: ReactNode;
  children: ReactNode;
}

/**
 * The single Import Wizard shell: header + stepper + content card + footer.
 * Reused by every import step so the flow reads as one coherent wizard rather
 * than eight unrelated pages. Uses a wider content area but keeps clear
 * Cancel/Back navigation (DOCX non-negotiable rule).
 */
export function WizardShell({
  title,
  subtitle,
  steps,
  currentId,
  onCancel,
  footer,
  children,
}: WizardShellProps) {
  return (
    <div className="crm-wizard">
      <header className="crm-wizard__header">
        <div>
          <h1 className="crm-wizard__title">{title}</h1>
          {subtitle ? <p className="crm-wizard__subtitle">{subtitle}</p> : null}
        </div>
        <IconButton label="Cancel import" icon={<X />} variant="outline" onClick={onCancel} />
      </header>

      <div className="crm-wizard__stepper">
        <Stepper items={steps} currentId={currentId} />
      </div>

      <div className="crm-wizard__content">{children}</div>

      <footer className="crm-wizard__footer">{footer}</footer>
    </div>
  );
}
