import { Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Badge, WidgetShell } from '@crm/design-system';
import type { BadgeTone } from '@crm/design-system';
import type { Campaign } from '@crm/mock-data';

const statusTone: Record<Campaign['status'], BadgeTone> = {
  draft: 'neutral',
  scheduled: 'info',
  sending: 'brand',
  completed: 'success',
  failed: 'danger',
};

export interface CampaignSummaryWidgetProps {
  campaigns: Campaign[];
  /** `error` reproduces a widget that failed to refresh during a partial Dashboard error. */
  forceState?: 'error';
}

/** DASH-S01 §7 row 7 (campaigns half) — delivery/read/reply summary, no spend. */
export function CampaignSummaryWidget({ campaigns, forceState }: CampaignSummaryWidgetProps) {
  const scopedHref = useScopedHref();

  return (
    <WidgetShell
      title="Campaigns"
      icon={<Megaphone />}
      footerTo={scopedHref('/campaigns')}
      footerLabel="Open Campaigns"
      state={forceState ?? (campaigns.length === 0 ? 'empty' : undefined)}
      stateTitle={forceState === 'error' ? 'Could not refresh campaign data' : 'No campaigns in scope'}
      stateDescription={forceState === 'error' ? 'Showing the last successfully loaded figures may help — try again shortly.' : undefined}
    >
      <ul className="crm-campaign-summary__list">
        {campaigns.map((campaign) => (
          <li key={campaign.id}>
            <Link to={scopedHref(`/campaigns/${campaign.id}`)} className="crm-campaign-summary__row">
              <span className="crm-campaign-summary__head">
                <span className="crm-campaign-summary__name">{campaign.name}</span>
                <Badge tone={statusTone[campaign.status]}>{campaign.status}</Badge>
              </span>
              <span className="crm-campaign-summary__metrics">
                <span>{campaign.performance.sent} sent</span>
                <span>{campaign.performance.delivered} delivered</span>
                <span>{campaign.performance.read} read</span>
                <span>{campaign.performance.replied} replied</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}
