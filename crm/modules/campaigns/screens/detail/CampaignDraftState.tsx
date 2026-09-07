import { Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Button } from '@crm/design-system';
import { findWhatsAppNumber } from '@crm/mock-data';
import { findTemplate } from '@crm/modules/templates/data';
import { formatDateTime, typeLabel } from '../../campaigns-labels';
import type { Campaign } from '../../domain/types';

/**
 * CAM-S02 "Draft" state. A draft has no send/recipient/analytics history, so
 * it does not get the full tab shell — it is a compact summary with a single
 * clear path back into the builder (CLAUDE.md §Campaign builder architecture
 * "Draft resume must return to the last meaningful incomplete step").
 */
export function CampaignDraftState({ campaign }: { campaign: Campaign }) {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();

  const sender = campaign.whatsappNumberId ? findWhatsAppNumber(campaign.whatsappNumberId) : undefined;
  const template = campaign.templateId ? findTemplate(campaign.templateId) : undefined;

  return (
    <div className="crm-camp-draft-state">
      <PageHeader
        title={campaign.name}
        breadcrumbs={[{ label: 'Campaigns', to: scopedHref('/campaigns') }, { label: campaign.name }]}
        description="This campaign is still a draft — nothing has been sent."
        actions={
          <Button
            variant="primary"
            iconLeft={<Pencil />}
            onClick={() => navigate(scopedHref('/campaigns/new', { draftId: campaign.id, step: campaign.draftLastStep ?? 'setup' }))}
          >
            Resume in builder
          </Button>
        }
      />

      <div className="crm-camp-draft-state__card">
        <dl>
          <div>
            <dt>Type</dt>
            <dd>{typeLabel[campaign.type]}</dd>
          </div>
          <div>
            <dt>Sender</dt>
            <dd>{sender ? `${sender.displayName} (${sender.displayNumber})` : 'Not selected yet'}</dd>
          </div>
          <div>
            <dt>Template</dt>
            <dd>{template ? template.name : 'Not selected yet'}</dd>
          </div>
          <div>
            <dt>Candidate audience</dt>
            <dd>{campaign.includedSources.length > 0 ? `${campaign.audience.finalEligible.toLocaleString('en-IN')} eligible so far` : 'Not configured yet'}</dd>
          </div>
          <div>
            <dt>Last edited</dt>
            <dd>{formatDateTime(campaign.updatedAt)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
