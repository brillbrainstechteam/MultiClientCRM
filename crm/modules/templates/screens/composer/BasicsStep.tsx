import { Info } from 'lucide-react';
import { Badge, Input, Select } from '@crm/design-system';
import type { BusinessUseCase, MetaCategory } from '../../domain/types';
import { existingTemplateNames } from '../../data/mockTemplates';
import { metaCategoryLabel, recommendedCategory, useCaseLabel } from '../../templates-labels';
import { resolveFormatCapabilities } from '../../domain/capabilityResolver';
import { useWabaScope } from '../../use-waba-scope';
import { localeOptions, type ComposerDraft } from './composer-state';

const useCaseOptions = Object.entries(useCaseLabel).map(([value, label]) => ({ value, label }));
const categoryOptions = Object.entries(metaCategoryLabel).map(([value, label]) => ({ value, label }));

export function BasicsStep({
  draft,
  setDraft,
}: {
  draft: ComposerDraft;
  setDraft: (updater: (draft: ComposerDraft) => ComposerDraft) => void;
}) {
  const { multiWaba, wabas } = useWabaScope();
  const capabilities = resolveFormatCapabilities(wabas.find((w) => w.id === draft.wabaId) ?? wabas[0]);
  const existingNames = existingTemplateNames(draft.wabaId, draft.editingTemplateId);
  const nameConflict = draft.name.length > 0 && existingNames.includes(draft.name);
  const nameFormatValid = draft.name.length === 0 || /^[a-z0-9_]+$/.test(draft.name);
  const recommended = recommendedCategory(draft.useCase);

  return (
    <div className="crm-tpl-basics">
      <Select
        label="Business goal / use case"
        options={useCaseOptions}
        value={draft.useCase}
        onChange={(e) => {
          const useCase = e.target.value as BusinessUseCase;
          setDraft((d) => ({
            ...d,
            useCase,
            metaCategory: d.categoryConfirmedByUser ? d.metaCategory : recommendedCategory(useCase),
          }));
        }}
      />
      <p className="crm-tpl-basics__recommend">Internal CRM classification — stays distinct from the Meta category below.</p>

      <div className="crm-tpl-basics__category">
        <Select
          label="Meta category"
          options={categoryOptions}
          value={draft.metaCategory}
          onChange={(e) => setDraft((d) => ({ ...d, metaCategory: e.target.value as MetaCategory, categoryConfirmedByUser: true }))}
        />
        {draft.metaCategory === recommended ? (
          <p className="crm-tpl-basics__recommend">
            <Info aria-hidden="true" /> Recommended for "{useCaseLabel[draft.useCase]}".
          </p>
        ) : (
          <p className="crm-tpl-basics__recommend crm-tpl-basics__recommend--changed">
            <Info aria-hidden="true" /> Meta usually recommends {metaCategoryLabel[recommended]} for this use case — you can still submit as {metaCategoryLabel[draft.metaCategory]}.
          </p>
        )}
      </div>

      <Input
        label="Template name"
        required
        value={draft.name}
        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
        hint="Lowercase letters, numbers and underscores only. Must be unique for this WhatsApp Business Account."
        error={
          !nameFormatValid
            ? 'Only lowercase letters, numbers and underscores are allowed.'
            : nameConflict
              ? `A template named "${draft.name}" already exists for this account.`
              : undefined
        }
      />

      <Select
        label="Language"
        options={[{ value: '', label: 'Choose a language…' }, ...localeOptions]}
        value={draft.locale}
        onChange={(e) => {
          const locale = e.target.value;
          const label = localeOptions.find((l) => l.value === locale)?.label ?? locale;
          setDraft((d) => ({ ...d, locale, localeLabel: label }));
        }}
      />

      <label className="crm-tpl-basics__hinglish">
        <input
          type="checkbox"
          checked={draft.writingStyle === 'hinglish'}
          onChange={(e) => setDraft((d) => ({ ...d, writingStyle: e.target.checked ? 'hinglish' : 'standard' }))}
        />
        Write in Hinglish (writing style only — not a Meta locale)
      </label>

      {multiWaba ? (
        <Select
          label="WhatsApp Business Account"
          options={wabas.map((w) => ({ value: w.id, label: w.name }))}
          value={draft.wabaId}
          onChange={(e) => setDraft((d) => ({ ...d, wabaId: e.target.value }))}
        />
      ) : null}

      <div className="crm-tpl-basics__formats">
        <p className="crm-tpl-basics__formats-label">Template format</p>
        <div className="crm-tpl-basics__format-grid">
          {capabilities.map((cap) => (
            <button
              key={cap.format}
              type="button"
              className={`crm-tpl-basics__format${draft.format === cap.format ? ' is-selected' : ''}`}
              disabled={!cap.available}
              title={cap.reason}
              onClick={() => setDraft((d) => ({ ...d, format: cap.format }))}
            >
              <span>{cap.label}</span>
              {!cap.available ? <Badge tone="neutral">Unavailable</Badge> : null}
            </button>
          ))}
        </div>
        {capabilities.find((c) => c.format === draft.format && !c.available)?.reason ? (
          <p className="crm-tpl-basics__format-reason">{capabilities.find((c) => c.format === draft.format)?.reason}</p>
        ) : null}
      </div>
    </div>
  );
}

export function basicsValid(draft: ComposerDraft): boolean {
  const existingNames = existingTemplateNames(draft.wabaId, draft.editingTemplateId);
  return (
    draft.name.length > 0 &&
    /^[a-z0-9_]+$/.test(draft.name) &&
    !existingNames.includes(draft.name) &&
    draft.locale.length > 0
  );
}
