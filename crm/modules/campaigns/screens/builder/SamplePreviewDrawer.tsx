import { Badge, Drawer, Select } from '@crm/design-system';
import { contacts, findContact } from '@crm/mock-data';
import { WhatsAppTemplatePreview } from '@crm/modules/templates/components';
import { findTemplate } from '@crm/modules/templates/data';
import { resolveSampleValue } from '../../data/personalisationSources';
import type { Campaign } from '../../domain/types';

const sampleContactPool = contacts.slice(0, 8);

/**
 * CAM-DR04 — Sample Personalisation Preview. Resolves every variable mapping
 * for one chosen contact (via `resolveSampleValue`) and renders the result
 * through the same shared `WhatsAppTemplatePreview` bubble Templates uses, so
 * the preview always matches what recipients will actually see.
 */
export function SamplePreviewDrawer({
  open,
  contactId,
  draft,
  onClose,
  onChangeContact,
}: {
  open: boolean;
  contactId: string | null;
  draft: Campaign;
  onClose: () => void;
  onChangeContact: (contactId: string) => void;
}) {
  const template = draft.templateId ? findTemplate(draft.templateId) : undefined;
  const contact = contactId ? findContact(contactId) : undefined;

  if (!template) return null;

  const resolved = contact
    ? draft.variableMappings.map((mapping) => ({ mapping, ...resolveSampleValue(mapping, contact) }))
    : [];

  const previewComponents = {
    ...template.components,
    variables: template.components.variables.map((variable) => {
      const match = resolved.find((r) => r.mapping.variableIndex === variable.index);
      return match ? { ...variable, sampleValue: match.value } : variable;
    }),
  };

  return (
    <Drawer open={open} title="Sample personalisation preview" subtitle={template.name} onClose={onClose}>
      <div className="crm-camp-sample-preview__picker">
        <Select
          label="Preview as"
          options={sampleContactPool.map((c) => ({ value: c.id, label: `${c.name} · ${c.city}` }))}
          value={contact?.id ?? ''}
          onChange={(e) => onChangeContact(e.target.value)}
        />
      </div>

      {contact ? (
        <>
          <WhatsAppTemplatePreview components={previewComponents} format={template.format} />

          {resolved.length > 0 ? (
            <ul className="crm-camp-sample-preview__resolved">
              {resolved.map(({ mapping, value, usedFallback }) => (
                <li key={mapping.variableIndex}>
                  <span>{mapping.placeholder} — {mapping.description}</span>
                  <span className="crm-camp-sample-preview__value">
                    {value} {usedFallback ? <Badge tone="warning">Fallback used</Badge> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <p className="crm-camp-sample-preview__empty">Choose a contact to preview the resolved message.</p>
      )}
    </Drawer>
  );
}
