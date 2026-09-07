import { Badge } from '@crm/design-system';
import { statusLabel, statusTone } from '../campaigns-labels';
import type { Campaign } from '../domain/types';

/** Status badge for a campaign row/header. Archive is shown as a second chip, never a seventh status. */
export function CampaignStatusBadge({ campaign }: { campaign: Campaign }) {
  return (
    <span className="crm-camp-status-badges">
      <Badge tone={statusTone[campaign.status]}>{statusLabel[campaign.status]}</Badge>
      {campaign.isArchived ? <Badge tone="neutral" appearance="outline">Archived</Badge> : null}
    </span>
  );
}
