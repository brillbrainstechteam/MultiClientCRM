import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Badge } from '@crm/design-system';
import { CataloguePicker, type PickerMode } from '../components';

const sourceLabel: Record<string, string> = {
  inbox: 'Inbox',
  campaigns: 'Campaigns',
  templates: 'Templates',
  automation: 'Automation',
  contacts: 'Contacts',
  ai: 'AI Assistance',
  'selection-builder': 'Selection / Cart Builder',
  'catalogue-orders': 'Catalogue & Orders',
};

/**
 * `/catalogue-orders/picker` — deterministic capture host for the shared
 * Catalogue Picker (SKILL.md §3.8). Inbox/Campaigns/Templates/Automation
 * embed `<CataloguePicker>` directly once they wire the handoff (Batch 11);
 * this route gives the picker itself a reachable, capturable surface today
 * and is what `returnTo`-style deep links resolve to in the meantime.
 */
export default function CataloguePickerHostScreen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();

  const source = searchParams.get('source') ?? 'catalogue-orders';
  const mode = (searchParams.get('mode') as PickerMode | null) ?? 'multi';
  const catalogueId = searchParams.get('catalogueId') ?? undefined;
  const returnTo = searchParams.get('returnTo');
  const contactId = searchParams.get('contactId');
  const conversationId = searchParams.get('conversationId');

  function handleConfirm(itemIds: string[]) {
    const extra: Record<string, string> = { itemIds: itemIds.join(',') };
    if (contactId) extra.contactId = contactId;
    if (conversationId) extra.conversationId = conversationId;
    if (returnTo) {
      navigate(scopedHref(returnTo, extra));
    } else {
      navigate(scopedHref('/catalogue-orders/share', extra));
    }
  }

  return (
    <div className="crm-eco-picker-host">
      <PageHeader
        title="Choose catalogue items"
        description={`Requested by ${sourceLabel[source] ?? source}. Only active, customer-visible items are shown.`}
        actions={<Badge tone="brand" appearance="outline">Source: {sourceLabel[source] ?? source}</Badge>}
      />
      <CataloguePicker
        initialCatalogueId={catalogueId}
        mode={mode}
        confirmLabel={returnTo ? `Return to ${sourceLabel[source] ?? source} with this selection` : 'Continue to share'}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
