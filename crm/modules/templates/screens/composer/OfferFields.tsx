import { Button, Input, Textarea } from '@crm/design-system';
import type { TemplateComponents } from '../../domain/types';

/** TPL-S05E — Offer/Coupon Composer. */
export function OfferFields({
  components,
  setComponents,
}: {
  components: TemplateComponents;
  setComponents: (updater: (c: TemplateComponents) => TemplateComponents) => void;
}) {
  const offer = components.offer ?? { couponCode: '', expiryLabel: '', offerText: '' };

  return (
    <div className="crm-composer-fields">
      <section id="composer-section-body" className="crm-composer-fields__section">
        <h3>Offer message</h3>
        <Textarea
          label="Body"
          hideLabel
          rows={4}
          value={components.body}
          onChange={(e) => setComponents((c) => ({ ...c, body: e.target.value }))}
          placeholder="Hi {{1}}, use code {{2}} for 15% off — valid till {{3}}."
        />
      </section>

      <section id="composer-section-offer" className="crm-composer-fields__section">
        <h3>Offer details</h3>
        <div className="crm-composer-fields__row">
          <Input
            label="Coupon code"
            required
            value={offer.couponCode}
            onChange={(e) => setComponents((c) => ({ ...c, offer: { ...offer, couponCode: e.target.value.toUpperCase() } }))}
          />
          <Input
            label="Expiry"
            placeholder="e.g. 18 Aug 2026"
            value={offer.expiryLabel}
            onChange={(e) => setComponents((c) => ({ ...c, offer: { ...offer, expiryLabel: e.target.value } }))}
          />
        </div>
        <Input
          label="Offer summary (internal)"
          value={offer.offerText}
          onChange={(e) => setComponents((c) => ({ ...c, offer: { ...offer, offerText: e.target.value } }))}
          hint="Shown in the repository and library preview, not sent to the customer."
        />
        {components.buttons.length === 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setComponents((c) => ({ ...c, buttons: [{ id: `btn_${Date.now()}`, type: 'coupon', label: 'Apply code', value: offer.couponCode }] }))}
          >
            Add coupon button
          </Button>
        ) : null}
      </section>
    </div>
  );
}
