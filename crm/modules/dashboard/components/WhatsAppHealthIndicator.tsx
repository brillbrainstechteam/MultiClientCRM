import { PlugZap, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Button } from '@crm/design-system';
import type { WhatsAppConnectionStatus, WhatsAppNumber } from '@crm/mock-data';
import { connectionLabel, qualityLabel } from '../dashboard-presentation';

export interface WhatsAppHealthIndicatorProps {
  numbers: WhatsAppNumber[];
  /** `?state=healthy` reproduction — every number reads as connected/high. */
  forceHealthy?: boolean;
}

/**
 * Compact WhatsApp API-health indicator + CTA shown at the very top of the
 * Dashboard. It replaces the per-number "quality declining" / "disconnected"
 * attention cards and never exposes the raw phone number — only the number's
 * name and connection/quality health.
 *
 * - One linked number  → that number's status inline, "View health".
 * - Multiple numbers   → an aggregate ("X of Y connected", worst-case tone),
 *   "View numbers" opens the comparison.
 * - Any disconnected   → danger tone + a "Reconnect" CTA into Settings.
 */
export function WhatsAppHealthIndicator({ numbers, forceHealthy = false }: WhatsAppHealthIndicatorProps) {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();

  if (numbers.length === 0) return null;

  const statusOf = (n: WhatsAppNumber): WhatsAppConnectionStatus =>
    forceHealthy ? 'connected' : n.connectionStatus;

  const disconnected = numbers.filter((n) => statusOf(n) === 'disconnected');
  const degraded = numbers.filter((n) => statusOf(n) === 'degraded');
  const connected = numbers.filter((n) => statusOf(n) === 'connected');

  const tone = disconnected.length ? 'danger' : degraded.length ? 'warn' : 'ok';
  const single = numbers.length === 1 ? numbers[0] : null;
  const hasDisconnected = disconnected.length > 0;

  const openHealth = () =>
    single
      ? navigate(scopedHref('/dashboard', { drawer: 'wa-health', whatsappNumberId: single.id }))
      : navigate(scopedHref('/dashboard', { drawer: 'number-comparison' }));

  const reconnect = () =>
    single
      ? navigate(scopedHref(`/settings/whatsapp/numbers/${(disconnected[0] ?? single).id}`))
      : navigate(scopedHref('/settings/whatsapp'));

  const label = single
    ? `${single.displayName} — ${connectionLabel[statusOf(single)]} · Quality ${qualityLabel[forceHealthy ? 'high' : single.qualityRating]}`
    : `${connected.length} of ${numbers.length} WhatsApp numbers connected${
        hasDisconnected
          ? ` · ${disconnected.length} disconnected`
          : degraded.length
            ? ` · ${degraded.length} degraded`
            : ''
      }`;

  return (
    <div className={`crm-wa-ind crm-wa-ind--${tone}`} role="status" aria-label="WhatsApp connection health">
      <span className="crm-wa-ind__left">
        <span className="crm-wa-ind__dot" aria-hidden="true" />
        <Radio className="crm-wa-ind__icon" aria-hidden="true" />
        <span className="crm-wa-ind__label">{label}</span>
      </span>
      <span className="crm-wa-ind__actions">
        {hasDisconnected ? (
          <Button variant="primary" size="sm" iconLeft={<PlugZap />} onClick={reconnect}>
            Reconnect
          </Button>
        ) : null}
        <Button variant="secondary" size="sm" onClick={openHealth}>
          {single ? 'View health' : 'View numbers'}
        </Button>
      </span>
    </div>
  );
}
