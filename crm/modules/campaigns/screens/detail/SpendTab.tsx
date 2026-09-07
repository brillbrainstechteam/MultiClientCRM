import { Banner, KpiCard, PermissionRestricted } from '@crm/design-system';
import { formatCurrency } from '../../campaigns-labels';
import type { CampaignCapabilityFlags } from '../../domain/capabilityResolver';
import type { Campaign } from '../../domain/types';

/**
 * Spend tab — gated by `campaign.view_spend`. Cost/pricing rules stay
 * deterministic mock fixtures (CLAUDE.md §Cost/spend guardrail); "Not
 * available" is shown whenever pricing data could not be retrieved rather
 * than inventing a number.
 */
export function SpendTab({ campaign, capabilities }: { campaign: Campaign; capabilities: CampaignCapabilityFlags }) {
  if (!capabilities.canViewSpend) {
    return (
      <PermissionRestricted
        title="You do not have access to spend data"
        description="Ask a workspace owner or manager if you need visibility into campaign spend."
      />
    );
  }

  const { spend } = campaign;

  return (
    <div className="crm-camp-spend-tab">
      {!spend.estimateAvailable && !spend.actualAvailable ? (
        <Banner tone="info" title="Pricing data is not available" description={spend.note ?? 'Cost figures could not be retrieved for this campaign.'} />
      ) : null}

      <div className="crm-camp-spend-tab__kpis">
        <KpiCard label="Estimated cost" value={spend.estimateAvailable && spend.estimatedCost !== null ? formatCurrency(spend.estimatedCost, spend.currency) : 'Not available'} />
        <KpiCard label="Actual spend" value={spend.actualAvailable && spend.actualSpend !== null ? formatCurrency(spend.actualSpend, spend.currency) : 'Not available'} emphasis="gold" />
      </div>
    </div>
  );
}
