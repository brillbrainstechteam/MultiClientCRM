import type { ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { Banner, Button, EmptyState, PermissionRestricted } from '@crm/design-system';
import { findWhatsAppNumber, findUser } from '@crm/mock-data';
import { findTemplate } from '@crm/modules/templates/data';
import { CampaignStatusBadge } from '../components';
import { formatCurrency, formatDateTime, typeLabel } from '../campaigns-labels';
import { findCampaign } from '../data/mockCampaigns';
import type { Campaign } from '../domain/types';
import { can } from '../permissions';

const MAX_COMPARE = 4;

interface CompareRow {
  key: string;
  label: string;
  render: (campaign: Campaign) => ReactNode;
}

const rows: CompareRow[] = [
  { key: 'status', label: 'Status', render: (c) => <CampaignStatusBadge campaign={c} /> },
  { key: 'type', label: 'Type', render: (c) => typeLabel[c.type] },
  { key: 'sender', label: 'Sender', render: (c) => (c.whatsappNumberId ? findWhatsAppNumber(c.whatsappNumberId)?.displayName ?? c.whatsappNumberId : '—') },
  { key: 'template', label: 'Template', render: (c) => (c.templateId ? findTemplate(c.templateId)?.name ?? c.templateId : 'No template') },
  { key: 'creator', label: 'Created by', render: (c) => findUser(c.creatorId)?.name ?? 'Unknown' },
  { key: 'sent-at', label: 'Sent / scheduled for', render: (c) => (c.scheduledAt ? formatDateTime(c.scheduledAt) : '—') },
  { key: 'eligible', label: 'Final eligible audience', render: (c) => c.audience.finalEligible.toLocaleString('en-IN') },
  { key: 'sent', label: 'Sent', render: (c) => (c.analytics ? c.analytics.sent.toLocaleString('en-IN') : '—') },
  { key: 'delivered', label: 'Delivered', render: (c) => (c.analytics ? c.analytics.delivered.toLocaleString('en-IN') : '—') },
  { key: 'read', label: 'Read', render: (c) => (c.analytics ? c.analytics.read.toLocaleString('en-IN') : '—') },
  { key: 'replied', label: 'Replied', render: (c) => (c.analytics ? c.analytics.replied.toLocaleString('en-IN') : '—') },
  { key: 'failed', label: 'Failed', render: (c) => (c.analytics ? c.analytics.failed.toLocaleString('en-IN') : '—') },
  {
    key: 'clicks',
    label: 'Clicks',
    render: (c) => (!c.analytics ? '—' : c.analytics.clicksAvailable ? (c.analytics.clicks ?? 0).toLocaleString('en-IN') : 'Not available'),
  },
  {
    key: 'conversions',
    label: 'Conversions',
    render: (c) => (!c.analytics ? '—' : c.analytics.conversionsAvailable ? (c.analytics.conversions ?? 0).toLocaleString('en-IN') : 'Not available'),
  },
  {
    key: 'cost-per-result',
    label: 'Cost per result',
    render: (c) =>
      !c.analytics
        ? '—'
        : c.analytics.costPerResultAvailable && c.analytics.costPerResult !== null
          ? formatCurrency(c.analytics.costPerResult, c.analytics.currency)
          : 'Not available',
  },
  {
    key: 'estimated-cost',
    label: 'Estimated cost',
    render: (c) => (c.spend.estimateAvailable && c.spend.estimatedCost !== null ? formatCurrency(c.spend.estimatedCost, c.spend.currency) : 'Not available'),
  },
  {
    key: 'actual-spend',
    label: 'Actual spend',
    render: (c) => (c.spend.actualAvailable && c.spend.actualSpend !== null ? formatCurrency(c.spend.actualSpend, c.spend.currency) : 'Not available'),
  },
];

/**
 * CAM-S08 — Compare Campaigns. Reads `?campaigns=id1,id2,...` (Overview's
 * bulk-select action already caps this at 2-4 before navigating here).
 * Fewer than 2 resolvable campaigns is the "insufficient data" state rather
 * than a silent empty comparison.
 */
export default function CampaignsCompareScreen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role, currentUser, visibleModules } = useWorkspace();

  if (!visibleModules.includes('campaigns')) {
    return (
      <PermissionRestricted
        title="You do not have access to Campaigns"
        description={`Your role (${currentUser.roleLabel}) cannot open Campaigns.`}
      />
    );
  }

  if (!can(role, 'campaign.compare')) {
    return (
      <PermissionRestricted
        title="You do not have access to Compare Campaigns"
        description={`Your role (${currentUser.roleLabel}) cannot compare campaigns.`}
      />
    );
  }

  const requestedIds = (searchParams.get('campaigns') ?? '').split(',').map((id) => id.trim()).filter(Boolean);
  const forcedInsufficient = searchParams.get('state') === 'insufficient-data';
  const resolved = requestedIds.map((id) => findCampaign(id)).filter((c): c is Campaign => c !== undefined);
  const campaignsToShow = resolved.slice(0, MAX_COMPARE);
  const truncated = resolved.length > MAX_COMPARE;

  const insufficient = forcedInsufficient || campaignsToShow.length < 2;

  return (
    <div className="crm-camp-compare">
      <PageHeader
        title="Compare Campaigns"
        description="Side-by-side comparison of up to 4 campaigns."
        breadcrumbs={[{ label: 'Campaigns', to: scopedHref('/campaigns') }, { label: 'Compare' }]}
        actions={
          <Button variant="secondary" onClick={() => navigate(scopedHref('/campaigns'))}>
            Back to Campaigns
          </Button>
        }
      />

      {insufficient ? (
        <EmptyState
          title="Not enough campaigns selected"
          description="Select at least 2 campaigns (up to 4) from the Campaigns list, then choose Compare."
          actions={
            <Button variant="primary" onClick={() => navigate(scopedHref('/campaigns'))}>
              Go to Campaigns
            </Button>
          }
        />
      ) : (
        <>
          {truncated ? (
            <Banner
              tone="info"
              title="Showing the first 4 selected campaigns"
              description="Compare supports up to 4 campaigns at a time."
            />
          ) : null}
          {requestedIds.length !== resolved.length ? (
            <Banner
              tone="warning"
              title="Some selected campaigns could not be found"
              description="They may have been removed, or the link is out of date."
            />
          ) : null}

          <div className="crm-camp-compare__table-wrap">
            <table className="crm-camp-compare__table">
              <thead>
                <tr>
                  <th scope="col">Metric</th>
                  {campaignsToShow.map((c) => (
                    <th scope="col" key={c.id}>
                      <button type="button" className="crm-camp-compare__campaign-link" onClick={() => navigate(scopedHref(`/campaigns/${c.id}`))}>
                        {c.name}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <th scope="row">{row.label}</th>
                    {campaignsToShow.map((c) => (
                      <td key={c.id}>{row.render(c)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
