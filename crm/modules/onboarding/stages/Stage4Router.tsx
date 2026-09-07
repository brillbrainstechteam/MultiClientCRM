import { useNavigate } from 'react-router-dom';
import { useQueryPatch } from '@crm/app/use-query-patch';
import { findOnboardingNumber, type PayerMode, type PaymentStatus } from '@crm/mock-data';
import { MessagingFundingStep } from './stage4/MessagingFundingStep';
import { PaymentStep } from './stage4/PaymentStep';
import { PlanActivationStep } from './stage4/PlanActivationStep';
import { TeamAssignmentStep } from './stage4/TeamAssignmentStep';
import type { StageRouterProps } from './Stage1Router';

/**
 * Stage 4 — Activate & Assign (B01 Plan Activation, B03 Payment, B02
 * Messaging Funding, C16 Team & Inbox Setup).
 */
export function Stage4Router({ mode, numberId }: StageRouterProps) {
  const navigate = useNavigate();
  const [params, patch] = useQueryPatch();
  const step = params.get('step') ?? 'plan';
  const record = numberId ? findOnboardingNumber(numberId) : undefined;
  const payer = (params.get('payer') as PayerMode | null) ?? record?.billingContext.payerMode ?? 'provider_wallet';
  const paymentState = (params.get('state') as PaymentStatus | null) ?? 'pending';
  const balanceOverride =
    params.get('state') === 'low-balance' ? 'low' : params.get('state') === 'no-balance' ? 'none' : null;

  const readyTarget = numberId ? `/setup/ready?number=${numberId}` : '/setup/ready';
  const exitTarget = mode === 'add-number' ? '/settings/whatsapp' : readyTarget;

  if (step === 'payment') {
    return (
      <PaymentStep
        status={paymentState}
        onBack={() => patch({ step: 'plan', state: null })}
        onSimulate={(status) => patch({ state: status })}
        onContinue={() => patch({ step: 'funding', payer, state: null })}
      />
    );
  }

  if (step === 'funding') {
    return (
      <MessagingFundingStep
        payerMode={payer}
        balanceOverride={balanceOverride}
        onBack={() => patch({ step: 'payment', state: 'success' })}
        onContinue={() => patch({ step: 'team' })}
      />
    );
  }

  if (step === 'team') {
    return (
      <TeamAssignmentStep
        branchId={record?.branchId ?? null}
        onBack={() => patch({ step: 'funding' })}
        onContinue={() => navigate(exitTarget)}
      />
    );
  }

  return (
    <PlanActivationStep
      onBack={() => patch({ stage: 'meta', step: 'progress' })}
      onContinue={() => patch({ step: 'payment', state: 'pending' })}
    />
  );
}
