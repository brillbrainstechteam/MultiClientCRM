import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Badge, Button, Modal, Textarea } from '@crm/design-system';
import { CataloguePicker } from '@crm/modules/catalogue-orders/components';
import { findItem } from '@crm/modules/catalogue-orders/data';
import type { FormatAvailability } from '../../domain/capabilityResolver';
import type { TemplateComponents } from '../../domain/types';

/**
 * TPL-S05C — Catalogue Content Slot (Requirement §O): the template stores a
 * reference to real catalogue items via the shared Catalogue Picker
 * (SKILL.md §3.8), never a duplicated/hardcoded product list. The picker
 * renders inline in a modal — not a full-page navigation — because the
 * composer draft (`ComposerDraft`) lives only in this wizard's in-memory
 * state and would be lost on a route change.
 */
export function CatalogueFields({
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const catalogue = components.catalogue ?? { connected: false, productIds: [] };

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

  const selectedItems = catalogue.productIds.map((id) => findItem(id)).filter((item): item is NonNullable<typeof item> => Boolean(item));

  function applySelection(itemIds: string[]) {
    const first = itemIds[0] ? findItem(itemIds[0]) : undefined;
    setComponents((c) => ({
      ...c,
      catalogue: { connected: true, catalogueId: first?.catalogueId ?? catalogue.catalogueId, productIds: itemIds },
    }));
    setPickerOpen(false);
  }

  function removeProduct(id: string) {
    setComponents((c) => ({
      ...c,
      catalogue: { ...catalogue, productIds: catalogue.productIds.filter((p) => p !== id) },
    }));
  }

  return (
    <div className="crm-composer-fields">
      <section id="composer-section-body" className="crm-composer-fields__section">
        <h3>Intro body</h3>
        <Textarea
          label="Body"
          hideLabel
          rows={3}
          value={components.body}
          onChange={(e) => setComponents((c) => ({ ...c, body: e.target.value }))}
          placeholder="Hi {{1}}, here are a few picks…"
        />
      </section>

      <section id="composer-section-catalogue" className="crm-composer-fields__section">
        <h3>Select products</h3>
        <p className="crm-composer-fields__helper">Products are managed in Catalogue &amp; Orders — the template stores this slot's item selection, not a copy of product data.</p>
        {selectedItems.length === 0 ? (
          <p className="crm-composer-fields__helper">No products selected yet.</p>
        ) : (
          <ul className="crm-composer-fields__catalogue-list">
            {selectedItems.map((item) => (
              <li key={item.id}>
                <Badge tone="neutral" appearance="outline">{item.title}</Badge>
                <Button variant="ghost" size="sm" onClick={() => removeProduct(item.id)} aria-label={`Remove ${item.title}`}>Remove</Button>
              </li>
            ))}
          </ul>
        )}
        <Button variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>Choose products</Button>
      </section>

      <Modal open={pickerOpen} title="Choose catalogue products" onClose={() => setPickerOpen(false)} size="lg">
        <CataloguePicker mode="multi" confirmLabel="Add to template" onConfirm={applySelection} />
      </Modal>
    </div>
  );
}
