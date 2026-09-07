import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Copy, ImageOff, Megaphone, MessageCircle, ShoppingBag } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { findContact } from '@crm/mock-data';
import { Banner, Button, EmptyState, Textarea, Toast } from '@crm/design-system';
import { PriceDisplay } from '../components';
import { findItem } from '../data';
import { can } from '../permissions';
import { useWorkspace } from '@crm/app/workspace-context';

/** ECO-S18 — Share Preview / Composer. Validates a picker selection and routes it onward. */
export default function ShareComposerScreen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role } = useWorkspace();
  const [toast, setToast] = useState<string | null>(null);

  const itemIds = (searchParams.get('itemIds') ?? '').split(',').filter(Boolean);
  const contactId = searchParams.get('contactId');
  const conversationId = searchParams.get('conversationId');
  const contact = contactId ? findContact(contactId) : undefined;

  const items = useMemo(() => itemIds.map((id) => findItem(id)).filter((i): i is NonNullable<typeof i> => Boolean(i)), [itemIds]);

  const messageText = useMemo(
    () => items.map((item) => `• ${item.whatsappCaption}`).join('\n'),
    [items],
  );

  function copyText() {
    navigator.clipboard?.writeText(messageText).then(
      () => setToast('Message text copied.'),
      () => setToast('Could not copy — select and copy the text manually.'),
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No items selected"
        description="Open the Catalogue Picker to choose items before sharing."
        actions={<Button variant="primary" onClick={() => navigate(scopedHref('/catalogue-orders/picker'))}>Open Catalogue Picker</Button>}
      />
    );
  }

  return (
    <div className="crm-eco-share">
      <PageHeader
        breadcrumbs={[{ label: 'Catalogues', to: scopedHref('/catalogue-orders/catalogues') }, { label: 'Share preview' }]}
        title="Share preview"
        description={`${items.length} item${items.length === 1 ? '' : 's'} selected from the Catalogue Picker.`}
      />

      {contact ? (
        <Banner tone="info" title={`Sharing with ${contact.name}`} description="A single recipient routes through Inbox — this stays a one-to-one conversation, not a campaign." />
      ) : (
        <Banner tone="info" title="No single contact selected" description="Send this as a Campaign to a segment, or reopen the picker from an Inbox conversation to share with one contact." />
      )}

      <div className="crm-eco-share__items">
        {items.map((item) => {
          const cover = item.media.find((m) => m.isCover) ?? item.media[0];
          return (
            <div key={item.id} className="crm-eco-share__item">
              <span className="crm-eco-share__thumb">
                {cover && cover.status === 'ok' ? <img src={cover.url} alt="" /> : <ImageOff size={16} aria-hidden="true" />}
              </span>
              <div className="crm-eco-share__item-body">
                <p className="crm-eco-share__item-title">{item.title}</p>
                <PriceDisplay price={item.price} />
                <p className="crm-eco-share__item-caption">{item.whatsappCaption}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="crm-eco-share__message">
        <Textarea label="Message preview (editable copy, not sent from here)" value={messageText} readOnly rows={Math.min(items.length + 1, 8)} />
        <Button variant="secondary" size="sm" iconLeft={<Copy />} onClick={copyText}>Copy text</Button>
      </div>

      <div className="crm-eco-share__actions">
        {contact && can(role, 'catalogue.share') ? (
          <Button
            variant="primary"
            iconLeft={<MessageCircle />}
            onClick={() => navigate(scopedHref('/inbox', { conversationId: conversationId ?? '', contactId: contact.id, sharedItemIds: itemIds.join(',') }))}
          >
            Share to Inbox
          </Button>
        ) : null}
        {can(role, 'catalogue.share') ? (
          <Button variant="secondary" iconLeft={<Megaphone />} onClick={() => navigate(scopedHref('/campaigns', { catalogueItemIds: itemIds.join(',') }))}>
            Send as Campaign
          </Button>
        ) : null}
        {can(role, 'selection.create') ? (
          <Button
            variant="secondary"
            iconLeft={<ShoppingBag />}
            onClick={() => navigate(scopedHref('/catalogue-orders/selections/new', { itemIds: itemIds.join(','), ...(contactId ? { contactId } : {}) }))}
          >
            Create Saved Selection
          </Button>
        ) : null}
      </div>

      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
