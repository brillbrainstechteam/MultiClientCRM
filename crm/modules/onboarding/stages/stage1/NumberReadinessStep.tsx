import { useState } from 'react';
import { Banner, Input, Toggle } from '@crm/design-system';
import type { NumberUsageToday, OnboardingNumberRecord } from '@crm/mock-data';
import { ChoiceCard } from '../../components/ChoiceCard';
import { StepFooter } from '../../components/StepFooter';
import { StepHeader } from '../../components/StepHeader';

export interface NumberReadinessStepProps {
  record?: OnboardingNumberRecord;
  onBack: () => void;
  onContinue: (usageToday: NumberUsageToday) => void;
}

const usageOptions: { value: NumberUsageToday; title: string; description: string }[] = [
  { value: 'business_app', title: 'WhatsApp Business App', description: 'Already used with the free WhatsApp Business app.' },
  { value: 'existing_provider', title: 'Existing API / provider', description: 'Already connected through another BSP or WhatsApp API.' },
  { value: 'regular_whatsapp', title: 'Regular WhatsApp', description: 'Personal WhatsApp, not yet a business account.' },
  { value: 'new_unused', title: 'New / unused number', description: "Hasn't been used on WhatsApp before." },
  { value: 'not_sure', title: 'Not sure', description: "We'll ask a couple of extra questions to work it out." },
];

/**
 * C04 — Number Readiness. Progressive plain-language technical audit
 * (SKILL.md "Number Readiness"). Answers here are not proof of eligibility —
 * Stage 2 still resolves the strategy against a deterministic eligibility
 * fixture, so this step never promises Coexistence before it is confirmed.
 */
export function NumberReadinessStep({ record, onBack, onContinue }: NumberReadinessStepProps) {
  const [usage, setUsage] = useState<NumberUsageToday>(record?.usageToday ?? 'business_app');
  const [keepBusinessApp, setKeepBusinessApp] = useState(true);
  const [whoUses, setWhoUses] = useState('');
  const [providerName, setProviderName] = useState('');
  const [needsMigrationHelp, setNeedsMigrationHelp] = useState(false);
  const [canReceiveSmsVoice, setCanReceiveSmsVoice] = useState(true);

  return (
    <div>
      <StepHeader
        eyebrow="Stage 1 · Your Number"
        title="How is this number used today?"
        description="This is a technical check, not a marketing-consent question — it decides which connection options we can safely offer next."
      />

      <div className="crm-choice-list" role="radiogroup" aria-label="Number usage today">
        {usageOptions.map((option) => (
          <ChoiceCard
            key={option.value}
            title={option.title}
            description={option.description}
            selected={usage === option.value}
            onSelect={() => setUsage(option.value)}
          />
        ))}
      </div>

      {usage === 'business_app' ? (
        <div className="crm-form-section">
          <span className="crm-form-section__title">A couple more details</span>
          <Toggle
            label="Do you need to keep using the WhatsApp Business App as well?"
            checked={keepBusinessApp}
            onChange={setKeepBusinessApp}
          />
          <Input
            label="Who uses this number today?"
            placeholder="e.g. Front-desk team, on one shared phone"
            value={whoUses}
            onChange={(event) => setWhoUses(event.target.value)}
          />
        </div>
      ) : null}

      {usage === 'existing_provider' ? (
        <div className="crm-form-section">
          <span className="crm-form-section__title">A couple more details</span>
          <Input
            label="Current provider name (if known)"
            placeholder="e.g. Gupshup, Netcore, Twilio…"
            value={providerName}
            onChange={(event) => setProviderName(event.target.value)}
          />
          <Toggle
            label="Would you like migration help from our support team?"
            checked={needsMigrationHelp}
            onChange={setNeedsMigrationHelp}
          />
        </div>
      ) : null}

      {usage === 'regular_whatsapp' ? (
        <div className="crm-form-section">
          <Toggle
            label="Can this number still receive SMS or a voice call if required for verification?"
            checked={canReceiveSmsVoice}
            onChange={setCanReceiveSmsVoice}
          />
        </div>
      ) : null}

      {usage === 'not_sure' ? (
        <Banner
          tone="info"
          title="No problem — we'll recommend a safe default"
          description="You'll see the recommended option plus alternatives on the next screen, and nothing is final until you confirm."
        />
      ) : null}

      <StepFooter onBack={onBack} onContinue={() => onContinue(usage)} continueLabel="Continue" />
    </div>
  );
}
