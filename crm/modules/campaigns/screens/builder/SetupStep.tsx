import { Link, useNavigate } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Banner, Button, Input, Select } from '@crm/design-system';
import { findCampaign } from '../../data/mockCampaigns';
import type { Campaign, CampaignType } from '../../domain/types';
import type { WhatsAppNumber } from '@crm/mock-data';

const typeChoices: { value: CampaignType; label: string; description: string; phase2?: boolean }[] = [
  { value: 'one-time', label: 'One-time', description: 'Sent once to the audience you configure.' },
  { value: 'recurring', label: 'Recurring', description: 'Repeats on a schedule.', phase2: true },
  { value: 'trigger', label: 'Trigger-based', description: 'Sent automatically when an event occurs.', phase2: true },
  { value: 'api', label: 'API', description: 'Sent by an external system via API.', phase2: true },
];

/** CAM-S03 — Builder Setup: name, type, sender selection. */
export function SetupStep({
  draft,
  setDraft,
  availableWhatsAppNumbers,
}: {
  draft: Campaign;
  setDraft: (updater: (d: Campaign) => Campaign) => void;
  availableWhatsAppNumbers: WhatsAppNumber[];
}) {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const sender = availableWhatsAppNumbers.find((n) => n.id === draft.whatsappNumberId);
  const sourceCampaign = draft.sourceCampaignId ? findCampaign(draft.sourceCampaignId) : undefined;

  const numberOptions = [
    { value: '', label: 'Select a WhatsApp number…' },
    ...availableWhatsAppNumbers.map((n) => ({
      value: n.id,
      label: `${n.displayName} (${n.displayNumber})${n.connectionStatus !== 'connected' ? ` — ${n.connectionStatus}` : ''}`,
    })),
  ];

  return (
    <div className="crm-camp-setup-step">
      {draft.type === 'follow-up' && sourceCampaign ? (
        <Banner
          tone="info"
          title={`Follow-up from "${sourceCampaign.name}"`}
          description={
            <>
              This draft carries over the source campaign and sender. It will be revalidated for current eligibility
              before it can send.{' '}
              <Link to={scopedHref(`/campaigns/${sourceCampaign.id}`)}>View source campaign</Link>
            </>
          }
        />
      ) : null}

      <Input
        label="Campaign name"
        required
        placeholder="e.g. Festive Launch"
        value={draft.name}
        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value, updatedAt: new Date().toISOString() }))}
      />

      {draft.type !== 'follow-up' ? (
        <fieldset className="crm-camp-setup-step__types">
          <legend>Campaign type</legend>
          <div className="crm-camp-setup-step__type-grid">
            {typeChoices.map((choice) => (
              <button
                key={choice.value}
                type="button"
                className={`crm-camp-setup-step__type-card${draft.type === choice.value ? ' is-selected' : ''}`}
                onClick={() => setDraft((d) => ({ ...d, type: choice.value, updatedAt: new Date().toISOString() }))}
              >
                <span className="crm-camp-setup-step__type-label">
                  {choice.label}
                  {choice.phase2 ? <span className="crm-camp-setup-step__type-badge">Phase 2</span> : null}
                </span>
                <span className="crm-camp-setup-step__type-description">{choice.description}</span>
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      <Select
        label="WhatsApp sender number"
        required
        options={numberOptions}
        value={draft.whatsappNumberId ?? ''}
        onChange={(e) => setDraft((d) => ({ ...d, whatsappNumberId: e.target.value || null, updatedAt: new Date().toISOString() }))}
      />

      {sender && sender.connectionStatus !== 'connected' ? (
        <Banner
          tone="warning"
          title={`${sender.displayName} is ${sender.connectionStatus}`}
          description="You can keep building this draft, but sending or scheduling will be blocked until this number is reconnected."
          actions={
            <Button variant="secondary" size="sm" onClick={() => navigate(scopedHref('/settings/whatsapp-accounts', { whatsappNumberId: sender.id }))}>
              Go to Settings
            </Button>
          }
        />
      ) : null}
      {sender ? (
        <p className="crm-camp-setup-step__sender-meta">Quality: {sender.qualityRating} · Messaging limit: {sender.messagingLimit}</p>
      ) : null}
    </div>
  );
}
