import { useEffect } from 'react';
import { Banner } from '@crm/design-system';
import type { TemplateComponents } from '../../domain/types';
import { formatAvailability } from '../../domain/capabilityResolver';
import { WhatsAppTemplatePreview } from '../../components';
import { useWabaScope } from '../../use-waba-scope';
import type { ComposerDraft } from './composer-state';
import { StandardFields } from './StandardFields';
import { CarouselFields } from './CarouselFields';
import { CatalogueFields } from './CatalogueFields';
import { AuthenticationFields } from './AuthenticationFields';
import { OfferFields } from './OfferFields';
import { FlowFields } from './FlowFields';
import { PaymentFields } from './PaymentFields';

export function ComposeStep({
  draft,
  setDraft,
  forcedState,
  focusSection,
}: {
  draft: ComposerDraft;
  setDraft: (updater: (draft: ComposerDraft) => ComposerDraft) => void;
  forcedState: string | null;
  focusSection: string | null;
}) {
  const { wabas } = useWabaScope();
  const waba = wabas.find((w) => w.id === draft.wabaId) ?? wabas[0];
  const capability = formatAvailability(waba, draft.format);

  const setComponents = (updater: (c: TemplateComponents) => TemplateComponents) =>
    setDraft((d) => ({ ...d, components: updater(d.components) }));

  useEffect(() => {
    if (!focusSection) return;
    const el = document.getElementById(`composer-section-${focusSection}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('is-focused');
    const timeout = setTimeout(() => el.classList.remove('is-focused'), 2000);
    return () => clearTimeout(timeout);
  }, [focusSection]);

  return (
    <div className="crm-compose-step">
      <div className="crm-compose-step__editor">
        {forcedState === 'media-processing' ? (
          <Banner tone="info" title="Media is still processing" description="This upload can take a moment — you can keep editing other fields." />
        ) : null}
        {forcedState === 'autosave-failure' ? (
          <Banner tone="warning" title="Autosave failed" description="Your latest changes are kept in this session. Use Save Draft to retry saving." />
        ) : null}
        {forcedState === 'unsupported-format' ? (
          <Banner tone="danger" title="Format not supported for this account" description="Switch to a supported format on the Basics step." />
        ) : null}

        {draft.format === 'standard' ? <StandardFields components={draft.components} setComponents={setComponents} /> : null}
        {draft.format === 'carousel' ? <CarouselFields components={draft.components} setComponents={setComponents} /> : null}
        {draft.format === 'catalogue' ? <CatalogueFields components={draft.components} setComponents={setComponents} capability={capability} /> : null}
        {draft.format === 'authentication' ? <AuthenticationFields components={draft.components} setComponents={setComponents} /> : null}
        {draft.format === 'offer' ? <OfferFields components={draft.components} setComponents={setComponents} /> : null}
        {draft.format === 'flow' ? <FlowFields components={draft.components} setComponents={setComponents} capability={capability} /> : null}
        {draft.format === 'payment' ? <PaymentFields components={draft.components} setComponents={setComponents} capability={capability} /> : null}
      </div>

      <div className="crm-compose-step__preview">
        <WhatsAppTemplatePreview components={draft.components} format={draft.format} />
      </div>
    </div>
  );
}
