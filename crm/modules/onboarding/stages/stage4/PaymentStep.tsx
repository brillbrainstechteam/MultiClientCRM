import { CircleCheck, CircleX, LoaderCircle } from 'lucide-react';
import { Banner, Button } from '@crm/design-system';
import type { PaymentStatus } from '@crm/mock-data';
import { StepFooter } from '../../components/StepFooter';
import { StepHeader } from '../../components/StepHeader';

export interface PaymentStepProps {
  status: PaymentStatus;
  onBack: () => void;
  onSimulate: (status: PaymentStatus) => void;
  onContinue: () => void;
}

/**
 * B03 — Payment result. Pending/success/failed, retry-safe (SKILL.md
 * "Payment state" — retries must be modeled idempotently, entitlement only
 * updates on the deterministic verified-webhook-success state).
 */
export function PaymentStep({ status, onBack, onSimulate, onContinue }: PaymentStepProps) {
  return (
    <div>
      <StepHeader eyebrow="Stage 4 · Activate & Assign" title="Payment" />

      {status === 'pending' ? (
        <div className="crm-payment-state crm-payment-state--pending">
          <LoaderCircle aria-hidden="true" className="crm-payment-state__spin" />
          <div>
            <p className="crm-payment-state__title">Waiting for payment confirmation</p>
            <p className="crm-payment-state__description">
              This usually takes a few seconds. Your plan activates automatically once we receive a verified confirmation.
            </p>
          </div>
        </div>
      ) : status === 'success' ? (
        <div className="crm-payment-state crm-payment-state--success">
          <CircleCheck aria-hidden="true" />
          <div>
            <p className="crm-payment-state__title">Payment confirmed</p>
            <p className="crm-payment-state__description">Your plan is now active. An invoice has been generated.</p>
          </div>
        </div>
      ) : (
        <div className="crm-payment-state crm-payment-state--failed">
          <CircleX aria-hidden="true" />
          <div>
            <p className="crm-payment-state__title">Payment failed</p>
            <p className="crm-payment-state__description">Nothing was charged. Retrying is safe — the same payment reference is reused so you can't be charged twice.</p>
          </div>
        </div>
      )}

      {status !== 'success' ? (
        <Banner
          tone="info"
          title="Prototype limitation"
          description="A real payment gateway is not implemented here — use the controls below to preview each outcome."
        />
      ) : null}

      <div className="crm-payment-simulate">
        {status === 'pending' ? (
          <>
            <Button variant="primary" onClick={() => onSimulate('success')}>
              Simulate: confirmed
            </Button>
            <Button variant="secondary" onClick={() => onSimulate('failed')}>
              Simulate: failed
            </Button>
          </>
        ) : status === 'failed' ? (
          <Button variant="primary" onClick={() => onSimulate('pending')}>
            Retry payment (idempotent)
          </Button>
        ) : null}
      </div>

      <StepFooter onBack={onBack} onContinue={status === 'success' ? onContinue : undefined} continueLabel="Continue" />
    </div>
  );
}
