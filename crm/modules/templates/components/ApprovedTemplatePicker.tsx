import { useState } from 'react';
import { Button, SearchField } from '@crm/design-system';
import { templates } from '../data/mockTemplates';
import { isActive, type Template } from '../domain/types';
import { metaCategoryLabel, useCaseLabel } from '../templates-labels';
import { WhatsAppTemplatePreview } from './WhatsAppTemplatePreview';

export interface TemplateSelection {
  templateId: string;
  locale: string;
  wabaId: string;
}

/**
 * Shared Approved Template Picker (CODE_FIRST_ADAPTER.md "Shared Approved
 * Template Picker"). Reused by Campaigns/Inbox/Journeys so users never have
 * to go through the full Templates repository just to pick an approved
 * template. Preserves the caller's WABA scope; returns the selection.
 */
export function ApprovedTemplatePicker({
  wabaId,
  onSelect,
}: {
  wabaId?: string;
  onSelect: (selection: TemplateSelection) => void;
}) {
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const available = templates.filter((t) => isActive(t) && (!wabaId || t.wabaId === wabaId));
  const filtered = available.filter((t) => `${t.name} ${t.components.body}`.toLowerCase().includes(q.toLowerCase()));
  const selected = filtered.find((t) => t.id === selectedId) ?? filtered[0];

  return (
    <div className="crm-tpl-picker">
      <div className="crm-tpl-picker__list">
        <SearchField label="Search approved templates" placeholder="Search by name or message text…" value={q} onChange={(e) => setQ(e.target.value)} />
        <ul>
          {filtered.map((t) => (
            <li key={t.id}>
              <PickerRow template={t} active={t.id === selected?.id} onSelect={() => setSelectedId(t.id)} onUse={() => onSelect({ templateId: t.id, locale: t.locale, wabaId: t.wabaId })} />
            </li>
          ))}
          {filtered.length === 0 ? <p className="crm-tpl-picker__empty">No approved templates match.</p> : null}
        </ul>
      </div>
      <div className="crm-tpl-picker__preview">
        {selected ? <WhatsAppTemplatePreview components={selected.components} format={selected.format} /> : null}
      </div>
    </div>
  );
}

function PickerRow({ template, active, onSelect, onUse }: { template: Template; active: boolean; onSelect: () => void; onUse: () => void }) {
  return (
    <div className={`crm-tpl-picker__row${active ? ' is-active' : ''}`}>
      <button className="crm-tpl-picker__row-main" onClick={onSelect}>
        <p className="crm-tpl-picker__row-name">{template.name}</p>
        <p className="crm-tpl-picker__row-meta">{useCaseLabel[template.useCase]} · {metaCategoryLabel[template.metaCategory]} · {template.localeLabel}</p>
      </button>
      <Button variant="ghost" size="sm" onClick={onUse}>Use</Button>
    </div>
  );
}
