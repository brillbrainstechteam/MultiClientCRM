import { Pencil, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Banner, Button, EmptyState } from '@crm/design-system';
import type { WhatsAppNumber } from '@crm/mock-data';
import { ApprovedTemplatePicker, WhatsAppTemplatePreview, type TemplateSelection } from '@crm/modules/templates/components';
import { findTemplate, templates as allTemplates } from '@crm/modules/templates/data';
import { isActive } from '@crm/modules/templates/domain/types';
import { wabaForSender } from '../../domain/senderWaba';
import type { Campaign } from '../../domain/types';

/** CAM-S04 — Builder Template: approved-template-only selection, scoped to the sender's WABA. */
export function TemplateStep({
  draft,
  setDraft,
  sender,
  builderUrl,
}: {
  draft: Campaign;
  setDraft: (updater: (d: Campaign) => Campaign) => void;
  sender: WhatsAppNumber | undefined;
  /** Current builder URL, preserved so Templates can hand the user back here. */
  builderUrl: string;
}) {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const waba = wabaForSender(sender);

  const selectedTemplate = draft.templateId ? findTemplate(draft.templateId) : undefined;
  const selectionStillUsable = selectedTemplate ? isActive(selectedTemplate) : false;

  const onSelect = (selection: TemplateSelection) =>
    setDraft((d) => ({
      ...d,
      templateId: selection.templateId,
      templateLocale: selection.locale,
      updatedAt: new Date().toISOString(),
    }));

  const changeTemplate = () => setDraft((d) => ({ ...d, templateId: null, templateLocale: null }));

  if (!waba) {
    return (
      <Banner
        tone="warning"
        title="No WhatsApp Business Account is linked to this sender"
        description="Choose a different sender on the Setup step, or connect this number's WABA in Settings."
      />
    );
  }

  const availableCount = allTemplates.filter((t) => isActive(t) && t.wabaId === waba.id).length;

  if (availableCount === 0) {
    return (
      <EmptyState
        title="No approved templates for this WhatsApp Business Account"
        description={`${waba.name} has no approved, usable templates yet. Create one, or choose an existing template that has already been approved.`}
        actions={
          <>
            <Button
              variant="primary"
              iconLeft={<Plus />}
              onClick={() => navigate(scopedHref('/templates/new', { step: 'basics', returnTo: builderUrl }))}
            >
              Create Template
            </Button>
            <Button variant="secondary" onClick={() => navigate(scopedHref('/templates', { returnTo: builderUrl }))}>
              Go to Templates
            </Button>
          </>
        }
      />
    );
  }

  return (
    <div className="crm-camp-template-step">
      {draft.templateId && !selectionStillUsable ? (
        <Banner
          tone="warning"
          title="The previously selected template is no longer usable"
          description="It may have been rejected, disabled or archived since this draft was saved. Choose another approved template to continue."
        />
      ) : null}

      {selectedTemplate && selectionStillUsable ? (
        <div className="crm-camp-template-step__selected">
          <div className="crm-camp-template-step__selected-head">
            <div>
              <p className="crm-camp-template-step__selected-name">{selectedTemplate.name}</p>
              <p className="crm-camp-template-step__selected-meta">{selectedTemplate.localeLabel}</p>
            </div>
            <Button variant="secondary" iconLeft={<Pencil />} onClick={changeTemplate}>
              Change template
            </Button>
          </div>
          <WhatsAppTemplatePreview components={selectedTemplate.components} format={selectedTemplate.format} />
        </div>
      ) : (
        <ApprovedTemplatePicker wabaId={waba.id} onSelect={onSelect} />
      )}
    </div>
  );
}
