import { useNavigate } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Banner, Button, KpiCard } from '@crm/design-system';
import { formatCurrency } from '../../campaigns-labels';
import type { Campaign } from '../../domain/types';

/**
 * Analytics tab. Unavailable metrics (CLAUDE.md §Analytics guardrail) always
 * read "Not available", never `0` — clicks/conversions/cost-per-result are
 * only shown as a number when the underlying availability flag is true.
 * Conversion attribution setup and order-level drilldown are owned by
 * Settings and Catalogue/Orders respectively (CLAUDE.md §Module boundaries)
 * — both are real placeholder routes today (`/settings`, `/catalogue-orders`),
 * not screens Campaigns should build itself.
 */
export function AnalyticsTab({ campaign }: { campaign: Campaign }) {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const analytics = campaign.analytics;

  if (!analytics) {
    return (
      <Banner
        tone="info"
        title="Analytics are not available yet"
        description="Metrics appear once this campaign has started sending."
      />
    );
  }

  return (
    <div className="crm-camp-analytics-tab">
      {analytics.unavailableNote ? <Banner tone="info" title="Some metrics are not available" description={analytics.unavailableNote} /> : null}

      <div className="crm-camp-analytics-tab__kpis">
        <KpiCard label="Sent" value={analytics.sent.toLocaleString('en-IN')} />
        <KpiCard label="Delivered" value={analytics.delivered.toLocaleString('en-IN')} />
        <KpiCard label="Read" value={analytics.read.toLocaleString('en-IN')} />
        <KpiCard label="Replied" value={analytics.replied.toLocaleString('en-IN')} emphasis="gold" />
        <KpiCard label="Failed" value={analytics.failed.toLocaleString('en-IN')} />
        <KpiCard label="Clicks" value={analytics.clicksAvailable ? (analytics.clicks ?? 0).toLocaleString('en-IN') : 'Not available'} />
        <KpiCard label="Conversions" value={analytics.conversionsAvailable ? (analytics.conversions ?? 0).toLocaleString('en-IN') : 'Not available'} />
        <KpiCard
          label="Cost per result"
          value={analytics.costPerResultAvailable && analytics.costPerResult !== null ? formatCurrency(analytics.costPerResult, analytics.currency) : 'Not available'}
        />
      </div>

      {!campaign.conversionTrackingConfigured ? (
        <Banner
          tone="info"
          title="Conversion tracking is not configured"
          description="Set up conversion attribution in Settings to measure downstream outcomes for this campaign."
          actions={
            <Button variant="secondary" size="sm" onClick={() => navigate(scopedHref('/settings', { section: 'integrations', returnTo: `/campaigns/${campaign.id}?tab=analytics` }))}>
              Go to Settings
            </Button>
          }
        />
      ) : analytics.conversionsAvailable ? (
        <Button variant="ghost" size="sm" onClick={() => navigate(scopedHref('/catalogue-orders', { campaignId: campaign.id }))}>
          View orders in Catalogue &amp; Orders
        </Button>
      ) : null}
    </div>
  );
}
