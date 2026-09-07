import { useNavigate } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Banner, Button } from '@crm/design-system';
import type { WhatsAppNumber } from '@crm/mock-data';
import { findTemplate } from '@crm/modules/templates/data';
import { WhatsAppTemplatePreview } from '@crm/modules/templates/components';
import { AudienceBreakdownPanel, CampaignProgressPanel } from '../../components';
import { formatDateTime } from '../../campaigns-labels';
import type { Campaign } from '../../domain/types';
import type { CampaignCapabilityFlags } from '../../domain/capabilityResolver';

export function OverviewTab({
  campaign,
  sender,
  capabilities,
}: {
  campaign: Campaign;
  sender: WhatsAppNumber | undefined;
  capabilities: CampaignCapabilityFlags;
}) {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const template = campaign.templateId ? findTemplate(campaign.templateId) : undefined;

  return (
    <div className="crm-camp-overview-tab">
      <div className="crm-camp-overview-tab__main">
        {!capabilities.senderConnected && sender ? (
          <Banner
            tone="warning"
            title="Sender number is not connected"
            description={capabilities.senderDisconnectedReason}
            actions={
              <Button variant="secondary" size="sm" onClick={() => navigate(scopedHref('/settings/whatsapp-accounts', { whatsappNumberId: sender.id }))}>
                Go to Settings
              </Button>
            }
          />
        ) : !capabilities.senderConnected ? (
          <Banner tone="warning" title="Sender number is not connected" description={capabilities.senderDisconnectedReason} />
        ) : null}

        {campaign.status === 'cancelled' ? (
          <Banner tone="info" title="This campaign was cancelled" description={campaign.cancelledReason} />
        ) : null}

        {campaign.progress ? (
          <section className="crm-camp-overview-tab__section">
            <h2>Send progress</h2>
            <CampaignProgressPanel progress={campaign.progress} />
          </section>
        ) : campaign.status === 'scheduled' ? (
          <section className="crm-camp-overview-tab__section">
            <h2>Schedule</h2>
            <p>
              Scheduled for <strong>{campaign.scheduledAt ? formatDateTime(campaign.scheduledAt) : 'an unspecified time'}</strong>
              {campaign.timezone ? ` (${campaign.timezone})` : ''}.
            </p>
            <p className="crm-camp-overview-tab__muted">
              Eligibility is re-checked at send time — new opt-outs or data changes since the snapshot will be excluded automatically.
            </p>
          </section>
        ) : null}

        <section className="crm-camp-overview-tab__section">
          <h2>Audience</h2>
          <AudienceBreakdownPanel breakdown={campaign.audience} snapshotAt={campaign.audienceSnapshotAt} />
        </section>
      </div>

      <div className="crm-camp-overview-tab__side">
        <section className="crm-camp-overview-tab__section">
          <h2>Message</h2>
          {template ? (
            <WhatsAppTemplatePreview components={template.components} format={template.format} />
          ) : (
            <p className="crm-camp-overview-tab__muted">No template attached.</p>
          )}
        </section>

        <section className="crm-camp-overview-tab__section">
          <h2>Sender</h2>
          <p>{sender ? `${sender.displayName} — ${sender.displayNumber}` : 'No sender selected'}</p>
          {sender ? <p className="crm-camp-overview-tab__muted">Quality: {sender.qualityRating} · Limit: {sender.messagingLimit}</p> : null}
        </section>
      </div>
    </div>
  );
}
