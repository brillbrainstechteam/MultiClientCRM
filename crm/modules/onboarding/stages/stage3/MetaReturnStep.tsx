import { AlertTriangle, CircleCheck, CircleX, ShieldAlert } from 'lucide-react';
import { Button } from '@crm/design-system';
import type { MetaReturnState } from '@crm/mock-data';
import { StepFooter } from '../../components/StepFooter';
import { StepHeader } from '../../components/StepHeader';

export interface MetaReturnStepProps {
  state: MetaReturnState;
  onRetry: () => void;
  onContactSupport: () => void;
  onBack: () => void;
  onContinue: () => void;
}

const stateContent: Record<MetaReturnState, { icon: typeof CircleCheck; tone: 'success' | 'danger' | 'warning'; title: string; description: string }> = {
  completed: {
    icon: CircleCheck,
    tone: 'success',
    title: 'Meta signup completed',
    description: 'Meta returned the business, WhatsApp account and number you selected. This is not the same as being fully ready — review the details next.',
  },
  cancelled: {
    icon: CircleX,
    tone: 'warning',
    title: 'You closed the Meta window',
    description: 'No changes were made on Meta’s side. You can try again whenever you’re ready.',
  },
  permission_missing: {
    icon: ShieldAlert,
    tone: 'warning',
    title: 'Missing business management permission',
    description: 'Meta returned without granting the access this CRM needs to manage messaging for your business. Ask your Meta Business admin to grant access, then try again.',
  },
  error: {
    icon: AlertTriangle,
    tone: 'danger',
    title: 'Meta reported an unexpected error',
    description: 'This is usually temporary. Try again — if it keeps happening, our support team can look into it with you.',
  },
};

/** C11 — Meta Return states. A successful return does not equal Ready. */
export function MetaReturnStep({ state, onRetry, onContactSupport, onBack, onContinue }: MetaReturnStepProps) {
  const content = stateContent[state];
  const Icon = content.icon;

  return (
    <div>
      <StepHeader eyebrow="Stage 3 · Connect with Meta" title="Meta signup result" />

      <div className={`crm-meta-return crm-meta-return--${content.tone}`}>
        <Icon aria-hidden="true" />
        <div>
          <p className="crm-meta-return__title">{content.title}</p>
          <p className="crm-meta-return__description">{content.description}</p>
        </div>
      </div>

      {state === 'completed' ? (
        <StepFooter onBack={onBack} onContinue={onContinue} continueLabel="Review connection" />
      ) : (
        <StepFooter
          onBack={onBack}
          secondary={
            <Button variant="ghost" onClick={onContactSupport}>
              Contact support
            </Button>
          }
          onContinue={onRetry}
          continueLabel="Try again"
        />
      )}
    </div>
  );
}
