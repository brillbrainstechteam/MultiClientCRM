import { plans, subscription } from '@crm/mock-data';
import { StepFooter } from '../../components/StepFooter';
import { StepHeader } from '../../components/StepHeader';

export interface PlanActivationStepProps {
  onBack: () => void;
  onContinue: () => void;
}

const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

/**
 * B01 — Plan Activation. Never labels the CRM subscription as a fee for
 * WhatsApp API access (SKILL.md "Plan activation"). Values are prototype
 * fixtures, not a real commercial catalogue.
 */
export function PlanActivationStep({ onBack, onContinue }: PlanActivationStepProps) {
  const plan = plans.find((p) => p.id === subscription.planId) ?? plans[0];

  return (
    <div>
      <StepHeader
        eyebrow="Stage 4 · Activate & Assign"
        title="Activate your CRM plan"
        description="This is your CRM subscription — separate from your WhatsApp messaging balance, which is set up next."
      />

      <div className="crm-plan-card">
        <div className="crm-plan-card__head">
          <span className="crm-plan-card__name">{plan.name} plan</span>
          <span className="crm-plan-card__cycle">Billed {plan.billingCycle}</span>
        </div>
        <dl className="crm-plan-card__facts">
          <div>
            <dt>Included users</dt>
            <dd>{plan.includedUsers}</dd>
          </div>
          <div>
            <dt>Included WhatsApp numbers</dt>
            <dd>{plan.includedNumbers}</dd>
          </div>
          <div>
            <dt>Additional numbers</dt>
            <dd>{plan.additionalNumberPolicy}</dd>
          </div>
        </dl>
        <div className="crm-plan-card__amount">
          <div className="crm-plan-card__amount-row">
            <span>Subtotal</span>
            <span>{currencyFormatter.format(plan.subtotal)}</span>
          </div>
          <div className="crm-plan-card__amount-row">
            <span>Taxes (GST)</span>
            <span>{currencyFormatter.format(plan.taxes)}</span>
          </div>
          <div className="crm-plan-card__amount-row crm-plan-card__amount-row--total">
            <span>Total due today</span>
            <span>{currencyFormatter.format(plan.total)}</span>
          </div>
        </div>
        <p className="crm-plan-card__note">
          Renews {plan.billingCycle}. An invoice is generated automatically — view it later under Billing → Usage / Invoices.
        </p>
      </div>

      <StepFooter onBack={onBack} onContinue={onContinue} continueLabel="Activate & pay" />
    </div>
  );
}
