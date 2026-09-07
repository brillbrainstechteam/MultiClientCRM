import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banner, Button, Toggle } from '@crm/design-system';
import { messagingWallet, type PayerMode } from '@crm/mock-data';
import { StepFooter } from '../../components/StepFooter';
import { StepHeader } from '../../components/StepHeader';

export interface MessagingFundingStepProps {
  payerMode: PayerMode;
  /** Demo-only override so `?state=low-balance|no-balance` can show a blocked-outbound state without editing the fixture. */
  balanceOverride?: 'low' | 'none' | null;
  onBack: () => void;
  onContinue: () => void;
}

const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

/**
 * B02 — Messaging Funding. Conditional by payer model (SKILL.md "Messaging
 * Funding"): provider-funded shows a real wallet with paid/promo balance;
 * direct/customer payer shows "Meta billing connected" without a forced CRM
 * wallet. Never a fake fixed message count.
 */
export function MessagingFundingStep({ payerMode, balanceOverride, onBack, onContinue }: MessagingFundingStepProps) {
  const navigate = useNavigate();
  const [autoTopup, setAutoTopup] = useState(messagingWallet.autoTopupConfig.enabled);
  const totalBalance =
    balanceOverride === 'none' ? 0 : balanceOverride === 'low' ? 150 : messagingWallet.paidBalance + messagingWallet.promoBalance;
  const noBalance = totalBalance <= 0;
  const lowBalance = noBalance || totalBalance <= messagingWallet.lowBalanceThreshold;

  if (payerMode === 'direct_meta') {
    return (
      <div>
        <StepHeader eyebrow="Stage 4 · Activate & Assign" title="Messaging billing" />
        <Banner
          tone="info"
          title="Meta billing connected"
          description="This WhatsApp account is billed directly by Meta on your existing payment method. The CRM does not add a separate messaging wallet for this number."
        />
        <StepFooter onBack={onBack} onContinue={onContinue} continueLabel="Continue" />
      </div>
    );
  }

  if (payerMode === 'needs_attention') {
    return (
      <div>
        <StepHeader eyebrow="Stage 4 · Activate & Assign" title="Messaging billing needs setup" />
        <Banner
          tone="warning"
          title="Billing model not yet determined"
          description="We couldn't confirm how outbound messaging will be billed for this number yet. You can continue setup — outbound messaging stays paused until this is resolved."
        />
        <StepFooter onBack={onBack} onContinue={onContinue} continueLabel="Continue anyway" />
      </div>
    );
  }

  return (
    <div>
      <StepHeader
        eyebrow="Stage 4 · Activate & Assign"
        title="Messaging balance"
        description="Meta charges per conversation based on actual usage — we never convert that into a fixed number of messages."
      />

      <div className="crm-wallet-card">
        <div className="crm-wallet-card__balances">
          {balanceOverride ? (
            <div>
              <span className="crm-wallet-card__label">Messaging balance</span>
              <span className="crm-wallet-card__value">{currencyFormatter.format(totalBalance)}</span>
            </div>
          ) : (
            <>
              <div>
                <span className="crm-wallet-card__label">Paid balance</span>
                <span className="crm-wallet-card__value">{currencyFormatter.format(messagingWallet.paidBalance)}</span>
              </div>
              <div>
                <span className="crm-wallet-card__label">Promo balance</span>
                <span className="crm-wallet-card__value">{currencyFormatter.format(messagingWallet.promoBalance)}</span>
              </div>
            </>
          )}
        </div>

        {noBalance ? (
          <Banner
            tone="danger"
            title="No messaging balance"
            description="Paid and template outbound messages are unavailable until you add balance. Inbox and history stay usable."
          />
        ) : lowBalance ? (
          <Banner
            tone="warning"
            title="Low balance"
            description="Outbound and template messages will pause once this balance reaches zero. Top up to avoid interruption."
          />
        ) : null}

        <div className="crm-wallet-card__actions">
          <Button variant="primary" onClick={() => navigate('/billing?tab=messaging-balance')}>
            Add messaging balance
          </Button>
          <Toggle
            label="Auto top-up"
            description={`Top up ${currencyFormatter.format(messagingWallet.autoTopupConfig.amount)} automatically when balance falls below ${currencyFormatter.format(messagingWallet.autoTopupConfig.threshold)}.`}
            checked={autoTopup}
            onChange={setAutoTopup}
          />
        </div>
      </div>

      <StepFooter onBack={onBack} onContinue={onContinue} continueLabel="Continue" />
    </div>
  );
}
