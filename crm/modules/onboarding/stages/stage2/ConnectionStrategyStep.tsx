import { Columns3 } from 'lucide-react';
import { useQueryPatch } from '@crm/app/use-query-patch';
import { Badge, Banner, Button } from '@crm/design-system';
import type { ConnectionStrategy, NumberUsageToday } from '@crm/mock-data';
import { StepFooter } from '../../components/StepFooter';
import { StepHeader } from '../../components/StepHeader';
import { CompareDrawer } from './CompareDrawer';
import { resolveStrategyEligibility } from './strategy-eligibility';

export interface ConnectionStrategyStepProps {
  usageToday: NumberUsageToday;
  forceUnavailable: boolean;
  onBack: () => void;
  onSelect: (strategy: ConnectionStrategy) => void;
}

/**
 * C05 — Connection Strategy. Shows one Recommended option and eligible
 * alternatives, never promising Coexistence before eligibility is confirmed
 * (SKILL.md "Connection Strategy").
 */
export function ConnectionStrategyStep({
  usageToday,
  forceUnavailable,
  onBack,
  onSelect,
}: ConnectionStrategyStepProps) {
  const [params, patch] = useQueryPatch();
  const compareOpen = params.get('drawer') === 'compare';
  const { recommended, requiresConfirmation, options } = resolveStrategyEligibility(usageToday, forceUnavailable);

  return (
    <div>
      <StepHeader
        eyebrow="Stage 2 · Best Connection Option"
        title="Choose how this number connects"
        description="Based on how you told us this number is used today, here is what we recommend — plus every other eligible option."
      />

      {requiresConfirmation ? (
        <Banner
          tone="info"
          title="We need one confirmation before recommending an option"
          description="Because you weren't sure how this number is used today, review each option below — eligibility is not final until Meta or your provider confirms it."
        />
      ) : null}

      {forceUnavailable ? (
        <Banner
          tone="warning"
          title="Coexistence is not available for this number right now"
          description="Meta has not enabled Coexistence for this account yet. We recommend moving the Business App number to the WhatsApp Business Platform instead."
        />
      ) : null}

      <div className="crm-strategy-list">
        {options.map((option) => (
          <article
            key={option.id}
            className={`crm-strategy-card${option.id === recommended ? ' crm-strategy-card--recommended' : ''}${!option.eligible ? ' crm-strategy-card--disabled' : ''}`}
          >
            <div className="crm-strategy-card__head">
              <h3 className="crm-strategy-card__title">{option.title}</h3>
              {option.id === recommended ? <Badge tone="success">Recommended</Badge> : null}
              {!option.eligible ? <Badge tone="neutral">Not eligible</Badge> : null}
            </div>
            <p className="crm-strategy-card__benefit">{option.benefit}</p>
            <dl className="crm-strategy-card__facts">
              <div>
                <dt>Operating change</dt>
                <dd>{option.operatingChange}</dd>
              </div>
              <div>
                <dt>Eligibility</dt>
                <dd>{option.eligibilityNote}</dd>
              </div>
              <div>
                <dt>History</dt>
                <dd>{option.historyExpectation}</dd>
              </div>
              {option.transitionNote ? (
                <div>
                  <dt>Transition</dt>
                  <dd>{option.transitionNote}</dd>
                </div>
              ) : null}
            </dl>
            <Button
              variant={option.id === recommended ? 'primary' : 'secondary'}
              disabled={!option.eligible}
              onClick={() => onSelect(option.id)}
            >
              Choose this option
            </Button>
          </article>
        ))}
      </div>

      <StepFooter
        onBack={onBack}
        secondary={
          <Button variant="ghost" iconLeft={<Columns3 />} onClick={() => patch({ drawer: 'compare' })}>
            Compare options
          </Button>
        }
        note="Select an option above to continue."
      />

      <CompareDrawer open={compareOpen} options={options} recommended={recommended} onClose={() => patch({ drawer: null })} />
    </div>
  );
}
