import { useNavigate } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Button, Input, Textarea } from '@crm/design-system';
import type { FormatAvailability } from '../../domain/capabilityResolver';
import type { TemplateComponents } from '../../domain/types';

/** TPL-S05G — Payment/Checkout Composer: capability-gated, no payment config here. */
export function PaymentFields({
  components,
  setComponents,
  capability,
}: {
  components: TemplateComponents;
  setComponents: (updater: (c: TemplateComponents) => TemplateComponents) => void;
  capability: FormatAvailability;
}) {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const payment = components.payment ?? { available: false };

  if (!capability.available) {
    return (
      <div className="crm-composer-fields">
        <div className="crm-composer-fields__dependency">
          <p>{capability.reason}</p>
          {capability.ctaLabel && capability.ctaTo ? (
            <Button variant="secondary" size="sm" onClick={() => navigate(scopedHref(capability.ctaTo as string, { returnTo: '/templates/new' }))}>
              {capability.ctaLabel}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="crm-composer-fields">
      <section id="composer-section-body" className="crm-composer-fields__section">
        <h3>Body</h3>
        <Textarea
          label="Body"
          hideLabel
          rows={3}
          value={components.body}
          onChange={(e) => setComponents((c) => ({ ...c, body: e.target.value }))}
          placeholder="Hi {{1}}, complete your payment of ₹{{2}} to confirm order #{{3}}."
        />
      </section>

      <section id="composer-section-payment" className="crm-composer-fields__section">
        <h3>Payment</h3>
        <p className="crm-composer-fields__helper">Connected via {payment.provider ?? 'the account\'s commerce provider'}. Configure providers in Commerce Settings.</p>
        <Input
          label="Provider label (internal)"
          value={payment.provider ?? ''}
          onChange={(e) => setComponents((c) => ({ ...c, payment: { available: true, provider: e.target.value } }))}
        />
        {components.buttons.length === 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setComponents((c) => ({ ...c, buttons: [{ id: `btn_${Date.now()}`, type: 'payment', label: 'Pay now' }] }))}
          >
            Add "Pay now" button
          </Button>
        ) : null}
      </section>
    </div>
  );
}
