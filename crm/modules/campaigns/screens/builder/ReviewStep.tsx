import { useState } from 'react';
import { CircleAlert, TriangleAlert } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { Badge, Banner, Button, Input, Modal, Select } from '@crm/design-system';
import { contacts, type WhatsAppNumber } from '@crm/mock-data';
import { WhatsAppTemplatePreview } from '@crm/modules/templates/components';
import { findTemplate } from '@crm/modules/templates/data';
import { AudienceBreakdownPanel } from '../../components';
import { formatCurrency, formatDateTime } from '../../campaigns-labels';
import { resolveSampleValue } from '../../data/personalisationSources';
import { resolveCampaignCapabilities } from '../../domain/capabilityResolver';
import type { Campaign } from '../../domain/types';

const timezoneOptions = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, UTC+5:30)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, UTC+4:00)' },
  { value: 'UTC', label: 'UTC' },
];

interface Blocker {
  id: string;
  message: string;
  step?: Campaign['draftLastStep'];
}

/** CAM-S07 — Builder Review & Launch: final message preview, audience, timing, cost, blockers/warnings, Send/Schedule. */
export function ReviewStep({
  draft,
  setDraft,
  sender,
  onDeepLink,
}: {
  draft: Campaign;
  setDraft: (updater: (d: Campaign) => Campaign) => void;
  sender: WhatsAppNumber | undefined;
  onDeepLink: (step: Campaign['draftLastStep']) => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role } = useWorkspace();
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const template = draft.templateId ? findTemplate(draft.templateId) : undefined;
  const capabilities = resolveCampaignCapabilities(role, draft, sender);

  const timing = (searchParams.get('timing') as 'now' | 'schedule' | null) ?? 'now';
  const modal = searchParams.get('modal');
  const costOverrideUnavailable = searchParams.get('cost') === 'unavailable';

  const setTiming = (next: 'now' | 'schedule') =>
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('timing', next);
      return p;
    });
  const openModal = (name: 'send' | 'schedule') => {
    setConfirmError(null);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('modal', name);
      return p;
    });
  };
  const closeModal = () =>
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.delete('modal');
      return p;
    });

  const previewContact = contacts[0];
  const previewComponents = template
    ? {
        ...template.components,
        variables: template.components.variables.map((variable) => {
          const mapping = draft.variableMappings.find((m) => m.variableIndex === variable.index);
          if (!mapping || !previewContact) return variable;
          return { ...variable, sampleValue: resolveSampleValue(mapping, previewContact).value };
        }),
      }
    : undefined;

  const blockers: Blocker[] = [];
  if (!capabilities.senderConnected) {
    blockers.push({ id: 'sender', message: capabilities.senderDisconnectedReason ?? 'Sender is unavailable.', step: 'setup' });
  }
  if (!capabilities.templateUsable) {
    blockers.push({ id: 'template', message: capabilities.templateUnusableReason ?? 'No usable template selected.', step: 'template' });
  }
  if (draft.audience.finalEligible === 0) {
    blockers.push({ id: 'audience', message: 'No eligible recipients remain after exclusions and personalisation.', step: 'audience' });
  }
  if (timing === 'schedule' && !draft.scheduledAt) {
    blockers.push({ id: 'schedule-time', message: 'Choose a schedule date and time before continuing.' });
  }

  const warnings: { id: string; message: string; step?: Campaign['draftLastStep'] }[] = [];
  if (draft.audience.invalidPersonalisation > 0) {
    warnings.push({
      id: 'personalisation',
      message: `${draft.audience.invalidPersonalisation.toLocaleString('en-IN')} recipient(s) are excluded because a required variable has no value and no fallback.`,
      step: 'personalisation',
    });
  }
  if (!draft.spend.estimateAvailable || costOverrideUnavailable) {
    warnings.push({ id: 'cost', message: 'Estimated cost is not available for this sender/template combination.' });
  }

  const canConfirmSend = capabilities.canSend && blockers.length === 0;
  const canConfirmSchedule = capabilities.canSchedule && blockers.filter((b) => b.id !== 'schedule-time').length === 0;

  const confirmSend = () => {
    if (blockers.length > 0) {
      setConfirmError('This campaign can no longer be sent as configured — resolve the blocking issues and try again.');
      return;
    }
    setDraft((d) => ({ ...d, status: 'live', updatedAt: new Date().toISOString() }));
    navigate(scopedHref('/campaigns', { view: 'live', flash: `"${draft.name}" is now sending.` }));
  };

  const confirmSchedule = () => {
    if (!draft.scheduledAt || blockers.filter((b) => b.id !== 'schedule-time').length > 0) {
      setConfirmError('This campaign can no longer be scheduled as configured — resolve the blocking issues and try again.');
      return;
    }
    setDraft((d) => ({ ...d, status: 'scheduled', audienceSnapshotAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
    navigate(
      scopedHref('/campaigns', {
        view: 'scheduled',
        flash: `"${draft.name}" is scheduled for ${formatDateTime(draft.scheduledAt)}.`,
      }),
    );
  };

  return (
    <div className="crm-camp-review-step">
      <div className="crm-camp-review-step__grid">
        <div className="crm-camp-review-step__column">
          <h3>Message preview</h3>
          {previewComponents && template ? (
            <WhatsAppTemplatePreview components={previewComponents} format={template.format} />
          ) : (
            <Banner tone="danger" title="No template selected" description="Go back to the Template step." />
          )}

          <h3>Sender</h3>
          <p className="crm-camp-review-step__line">
            {sender ? `${sender.displayName} (${sender.displayNumber})` : 'No sender selected'}
            {sender && sender.connectionStatus !== 'connected' ? <Badge tone="danger">{sender.connectionStatus}</Badge> : null}
          </p>
        </div>

        <div className="crm-camp-review-step__column">
          <h3>Audience</h3>
          <AudienceBreakdownPanel breakdown={draft.audience} snapshotAt={draft.audienceSnapshotAt} />

          <h3>Estimated cost</h3>
          <p className="crm-camp-review-step__line">
            {draft.spend.estimateAvailable && !costOverrideUnavailable && draft.spend.estimatedCost !== null
              ? formatCurrency(draft.spend.estimatedCost, draft.spend.currency)
              : 'Not available'}
          </p>
        </div>
      </div>

      <div className="crm-camp-review-step__timing">
        <h3>When should this send?</h3>
        <div className="crm-camp-review-step__timing-choice">
          <Button variant={timing === 'now' ? 'primary' : 'secondary'} onClick={() => setTiming('now')}>
            Send Now
          </Button>
          <Button variant={timing === 'schedule' ? 'primary' : 'secondary'} onClick={() => setTiming('schedule')}>
            Schedule for later
          </Button>
        </div>

        {timing === 'schedule' ? (
          <div className="crm-camp-review-step__schedule-fields">
            <Input
              label="Date & time"
              type="datetime-local"
              value={draft.scheduledAt ? draft.scheduledAt.slice(0, 16) : ''}
              onChange={(e) =>
                setDraft((d) => ({ ...d, scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null, updatedAt: new Date().toISOString() }))
              }
            />
            <Select
              label="Timezone"
              options={timezoneOptions}
              value={draft.timezone ?? 'Asia/Kolkata'}
              onChange={(e) => setDraft((d) => ({ ...d, timezone: e.target.value, updatedAt: new Date().toISOString() }))}
            />
          </div>
        ) : null}
      </div>

      {blockers.length > 0 ? (
        <div className="crm-camp-review-step__issues">
          {blockers.map((b) => (
            <Banner
              key={b.id}
              tone="danger"
              title={b.message}
              description={
                b.step ? (
                  <button className="crm-camp-review-step__deeplink" onClick={() => onDeepLink(b.step)}>
                    Fix on the {b.step} step
                  </button>
                ) : undefined
              }
            />
          ))}
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div className="crm-camp-review-step__issues">
          {warnings.map((w) => (
            <Banner
              key={w.id}
              tone="warning"
              title={w.message}
              description={
                w.step ? (
                  <button className="crm-camp-review-step__deeplink" onClick={() => onDeepLink(w.step)}>
                    Review on the {w.step} step
                  </button>
                ) : undefined
              }
            />
          ))}
        </div>
      ) : null}

      <div className="crm-camp-review-step__actions">
        {timing === 'now' ? (
          <Button
            variant="primary"
            disabled={!capabilities.canSend}
            title={capabilities.canSend ? undefined : 'Your role cannot send campaigns, or the sender/template is unavailable.'}
            onClick={() => openModal('send')}
          >
            Send Now
          </Button>
        ) : (
          <Button
            variant="primary"
            disabled={!capabilities.canSchedule || !draft.scheduledAt}
            title={
              !capabilities.canSchedule
                ? 'Your role cannot schedule campaigns, or the sender/template is unavailable.'
                : !draft.scheduledAt
                  ? 'Choose a date and time first.'
                  : undefined
            }
            onClick={() => openModal('schedule')}
          >
            Schedule
          </Button>
        )}
      </div>

      <Modal open={modal === 'send'} title="Send this campaign now?" onClose={closeModal} footer={
        <>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button variant="primary" disabled={!canConfirmSend} onClick={confirmSend}>Confirm & Send</Button>
        </>
      }>
        <div className="crm-camp-review-step__modal-body">
          <p>
            This will start sending <strong>{template?.name ?? 'this message'}</strong> to{' '}
            <strong>{draft.audience.finalEligible.toLocaleString('en-IN')} recipients</strong> from{' '}
            <strong>{sender ? sender.displayName : 'the selected sender'}</strong> immediately.
          </p>
          {confirmError ? (
            <p className="crm-camp-review-step__modal-error">
              <CircleAlert size={16} /> {confirmError}
            </p>
          ) : null}
        </div>
      </Modal>

      <Modal open={modal === 'schedule'} title="Schedule this campaign?" onClose={closeModal} footer={
        <>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button variant="primary" disabled={!canConfirmSchedule || !draft.scheduledAt} onClick={confirmSchedule}>Confirm & Schedule</Button>
        </>
      }>
        <div className="crm-camp-review-step__modal-body">
          <p>
            This will schedule <strong>{template?.name ?? 'this message'}</strong> for{' '}
            <strong>{draft.scheduledAt ? formatDateTime(draft.scheduledAt) : 'the chosen time'}</strong> (
            {draft.timezone ?? 'Asia/Kolkata'}) to{' '}
            <strong>{draft.audience.finalEligible.toLocaleString('en-IN')} candidate recipients</strong>. Eligibility is
            re-checked immediately before sending.
          </p>
          {confirmError ? (
            <p className="crm-camp-review-step__modal-error">
              <TriangleAlert size={16} /> {confirmError}
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
