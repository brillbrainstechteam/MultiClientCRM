import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryPatch } from '@crm/app/use-query-patch';
import { PageHeader } from '@crm/components';
import { Badge, Button, EmptyState } from '@crm/design-system';
import { onboardingNumbers, type HistoryChoice, type OnboardingNumberRecord } from '@crm/mock-data';
import { ChoiceCard } from '@crm/modules/onboarding/components/ChoiceCard';
import { ImportWizard } from './ImportWizard';
import { ManualSummaryDrawer } from './ManualSummaryDrawer';

const CHOICE_BADGE: Record<NonNullable<HistoryChoice>, { label: string; tone: 'success' | 'neutral' | 'info' }> = {
  imported: { label: 'Imported', tone: 'success' },
  reference: { label: 'Reference added', tone: 'info' },
  manual: { label: 'Manual summary added', tone: 'info' },
  skipped: { label: 'Skipped', tone: 'neutral' },
};

/**
 * H01 — History Centre (SKILL.md "History"). Post-connection and optional —
 * never part of the critical setup path. Picking a number is the entry point
 * since history is managed per WhatsApp number, not per tenant.
 */
export default function HistoryCentre() {
  const navigate = useNavigate();
  const [params, patch] = useQueryPatch();
  const numberId = params.get('numberId');
  const [overrides, setOverrides] = useState<Record<string, HistoryChoice>>({});

  const record: OnboardingNumberRecord | undefined = numberId
    ? onboardingNumbers.find((n) => n.id === numberId)
    : undefined;

  if (!record) {
    return (
      <div className="crm-history-centre">
        <PageHeader
          title="Historical Data"
          description="Bring past conversations into the CRM as reference. Optional — never blocks going live."
          breadcrumbs={[{ label: 'Settings', to: '/settings' }, { label: 'Historical Data' }]}
        />
        {onboardingNumbers.length === 0 ? (
          <EmptyState title="No WhatsApp numbers yet" description="Connect a number first from WhatsApp & Connections." />
        ) : (
          <div className="crm-history-centre__picker">
            {onboardingNumbers.map((number) => {
              const choice = overrides[number.id] ?? number.historyChoice;
              return (
                <ChoiceCard
                  key={number.id}
                  title={number.displayName}
                  description={number.phone || 'Phone pending'}
                  badge={choice ? <Badge tone={CHOICE_BADGE[choice].tone}>{CHOICE_BADGE[choice].label}</Badge> : <Badge tone="neutral">Not added</Badge>}
                  onSelect={() => patch({ numberId: number.id }, { replace: true })}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const effectiveChoice = overrides[record.id] ?? record.historyChoice;
  const wizardActive = params.get('wizard') === 'import';
  const wizardStep = params.get('step') ?? 'upload';
  const partial = params.get('state') === 'partial';
  const manualOpen = params.get('drawer') === 'manual-summary';

  const setChoice = (choice: HistoryChoice) => setOverrides((prev) => ({ ...prev, [record.id]: choice }));

  const onStepChange = (step: string | null) => {
    if (step === 'result') {
      patch({ step, state: record.id === 'wa_mumbai_sales' ? 'partial' : null });
    } else {
      patch({ step, state: null });
    }
  };

  if (wizardActive) {
    return (
      <ImportWizard
        record={record}
        step={wizardStep}
        partial={partial}
        onStepChange={onStepChange}
        onCancel={() => patch({ wizard: null, step: null, state: null })}
        onComplete={() => {
          setChoice('imported');
          patch({ wizard: null, step: null, state: null });
        }}
      />
    );
  }

  return (
    <div className="crm-history-centre">
      <PageHeader
        title="Historical Data"
        description={record.displayName}
        breadcrumbs={[
          { label: 'Settings', to: '/settings' },
          { label: 'Historical Data', to: '/settings/history' },
          { label: record.displayName },
        ]}
        actions={<Button variant="ghost" onClick={() => patch({ numberId: null })}>Change number</Button>}
      />

      <div className="crm-history-centre__card">
        <div className="crm-history-centre__status">
          <span>Current status</span>
          {effectiveChoice ? (
            <Badge tone={CHOICE_BADGE[effectiveChoice].tone}>{CHOICE_BADGE[effectiveChoice].label}</Badge>
          ) : (
            <Badge tone="neutral">Not added</Badge>
          )}
        </div>

        <div className="crm-history-centre__options">
          <ChoiceCard
            title="Import supported history"
            description="Bring over conversations from a supported prior source."
            onSelect={() => patch({ wizard: 'import', step: 'upload' })}
          />
          <ChoiceCard
            title="Upload chat export as reference"
            description="Visually distinct from live Meta messages — for context only."
            onSelect={() => {
              setChoice('reference');
              navigate(`/settings/whatsapp/numbers/${record.id}?tab=history`);
            }}
          />
          <ChoiceCard
            title="Add a manual history summary"
            description="Quick notes on past orders, quotes and follow-ups."
            onSelect={() => patch({ drawer: 'manual-summary' })}
          />
          <button type="button" className="crm-link-button" onClick={() => { setChoice('skipped'); }}>
            Do this later
          </button>
        </div>
      </div>

      <ManualSummaryDrawer
        open={manualOpen}
        record={record}
        onClose={() => patch({ drawer: null })}
        onSave={() => {
          setChoice('manual');
          patch({ drawer: null });
        }}
      />
    </div>
  );
}
