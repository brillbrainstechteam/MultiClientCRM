import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@crm/design-system';

export interface StepFooterProps {
  onBack?: () => void;
  backLabel?: string;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  /** Secondary action left of Continue, e.g. "Skip for now". */
  secondary?: ReactNode;
  /** Extra note shown left-aligned (e.g. "Progress is saved automatically"). */
  note?: string;
}

/**
 * The one footer bar every Guided Setup step uses (CLAUDE.md §4). Keeping this
 * shared — instead of each stage inventing its own Back/Continue row — is what
 * lets the flow read as one wizard even though branches diverge heavily
 * (coexistence vs migration vs new number, conditional verification, etc.).
 */
export function StepFooter({
  onBack,
  backLabel = 'Back',
  onContinue,
  continueLabel = 'Continue',
  continueDisabled,
  secondary,
  note,
}: StepFooterProps) {
  return (
    <div className="crm-step-footer">
      <div className="crm-step-footer__left">
        {onBack ? (
          <Button variant="ghost" iconLeft={<ArrowLeft />} onClick={onBack}>
            {backLabel}
          </Button>
        ) : null}
        {note ? <span className="crm-step-footer__note">{note}</span> : null}
      </div>
      <div className="crm-step-footer__right">
        {secondary}
        {onContinue ? (
          <Button variant="primary" iconRight={<ArrowRight />} onClick={onContinue} disabled={continueDisabled}>
            {continueLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
