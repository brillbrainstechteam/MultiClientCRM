import { Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { StatusBadge, WidgetShell } from '@crm/design-system';
import type { WhatsAppNumber } from '@crm/mock-data';
import { useAlertStatus } from '../alert-status-context';
import { connectionLabel, connectionTone, qualityLabel } from '../dashboard-presentation';
import { numberAlerts } from '../dashboard-selectors';

export interface WhatsAppHealthWidgetProps {
  numbers: WhatsAppNumber[];
  /** `?state=healthy` reproduction — every number renders as connected/high quality with no alerts. */
  forceHealthy?: boolean;
  /** `?state=partial-error` reproduction — data shown may be stale, but still usable. */
  forcePartial?: boolean;
}

/**
 * DASH-S01 §7 row 6 (left half) — WhatsApp Health. Each row keeps the
 * affected-number identity visible and opens DASH-S05; multiple numbers can
 * be compared via DASH-S06.
 */
export function WhatsAppHealthWidget({ numbers, forceHealthy = false, forcePartial = false }: WhatsAppHealthWidgetProps) {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { overrides } = useAlertStatus();

  return (
    <WidgetShell
      title="WhatsApp health"
      icon={<Radio />}
      actions={
        numbers.length > 1 ? (
          <button
            type="button"
            className="crm-wa-health__compare"
            onClick={() => navigate(scopedHref('/dashboard', { drawer: 'number-comparison' }))}
          >
            Compare
          </button>
        ) : undefined
      }
      state={numbers.length === 0 ? 'empty' : forcePartial ? 'partial' : undefined}
      stateTitle={forcePartial ? 'Showing recently cached data' : 'No WhatsApp numbers in scope'}
      stateDescription={
        forcePartial
          ? 'Quality and limit figures are from the last successful refresh and may be a few minutes stale.'
          : 'Connect a number or widen the branch/number filter to see health.'
      }
    >
      <ul className="crm-wa-health__list">
        {numbers.map((number) => {
          const alerts = forceHealthy ? [] : numberAlerts(number.id, overrides);
          const connectionStatus = forceHealthy ? 'connected' : number.connectionStatus;
          const qualityRating = forceHealthy ? 'high' : number.qualityRating;
          return (
            <li key={number.id}>
              <button
                type="button"
                className="crm-wa-health__row"
                onClick={() => navigate(scopedHref('/dashboard', { drawer: 'wa-health', whatsappNumberId: number.id }))}
              >
                <span className="crm-wa-health__identity">
                  <span className="crm-wa-health__name">{number.displayName}</span>
                  <span className="crm-wa-health__number">{number.department}</span>
                </span>
                <span className="crm-wa-health__status">
                  <StatusBadge tone={connectionTone[connectionStatus]}>{connectionLabel[connectionStatus]}</StatusBadge>
                  <span className="crm-wa-health__quality">Quality {qualityLabel[qualityRating]}</span>
                  {alerts.length > 0 ? (
                    <span className="crm-wa-health__alert-count">{alerts.length} alert{alerts.length > 1 ? 's' : ''}</span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </WidgetShell>
  );
}
