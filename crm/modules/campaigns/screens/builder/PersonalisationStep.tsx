import { useEffect } from 'react';
import { Eye } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Banner, Button, Input, Select } from '@crm/design-system';
import { contacts } from '@crm/mock-data';
import { findTemplate } from '@crm/modules/templates/data';
import { applyPersonalisationInvalidity } from '../../domain/audienceCalculation';
import type { Campaign, PersonalisationSourceType, VariableMapping } from '../../domain/types';
import { contactFieldOptions, estimateMappingIssues, needsFixedValue, needsSourceField, sourceTypeLabel } from '../../data/personalisationSources';
import { SamplePreviewDrawer } from './SamplePreviewDrawer';

const sourceTypeOptions = (Object.keys(sourceTypeLabel) as PersonalisationSourceType[]).map((value) => ({
  value,
  label: sourceTypeLabel[value],
}));

function computeInvalidPersonalisation(mappings: VariableMapping[]): number {
  return mappings.reduce((worst, m) => {
    if (m.fallbackValue.trim().length > 0) return worst;
    return Math.max(worst, m.missingCount + m.invalidFormatCount);
  }, 0);
}

/** CAM-S06 — Builder Personalisation: variable mapping, fallbacks, sample preview. */
export function PersonalisationStep({ draft, setDraft }: { draft: Campaign; setDraft: (updater: (d: Campaign) => Campaign) => void }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const template = draft.templateId ? findTemplate(draft.templateId) : undefined;
  const templateVars = template?.components.variables ?? [];
  const eligibleBeforePersonalisation = draft.audience.finalEligible + draft.audience.invalidPersonalisation;

  useEffect(() => {
    if (!template) return;
    setDraft((d) => {
      const existingByIndex = new Map(d.variableMappings.map((m) => [m.variableIndex, m]));
      const merged: VariableMapping[] = template.components.variables.map((v) => {
        const existing = existingByIndex.get(v.index);
        if (existing) return existing;
        const issues = estimateMappingIssues('contact-field', eligibleBeforePersonalisation);
        return {
          variableIndex: v.index,
          placeholder: `{{${v.index}}}`,
          description: v.description,
          sourceType: 'contact-field' as const,
          sourceField: 'name',
          fallbackValue: '',
          missingCount: issues.missingCount,
          invalidFormatCount: issues.invalidFormatCount,
        };
      });
      return { ...d, variableMappings: merged };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  const updateMapping = (variableIndex: number, patch: Partial<VariableMapping>) => {
    setDraft((d) => {
      const nextMappings = d.variableMappings.map((m) => {
        if (m.variableIndex !== variableIndex) return m;
        const next = { ...m, ...patch };
        if (patch.sourceType && patch.sourceType !== m.sourceType) {
          const issues = estimateMappingIssues(patch.sourceType, eligibleBeforePersonalisation);
          next.missingCount = issues.missingCount;
          next.invalidFormatCount = issues.invalidFormatCount;
          next.sourceField = patch.sourceType === 'contact-field' ? 'name' : '';
          next.fixedValue = '';
        }
        return next;
      });
      return {
        ...d,
        variableMappings: nextMappings,
        audience: applyPersonalisationInvalidity(d.audience, computeInvalidPersonalisation(nextMappings)),
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const openPreview = (contactId: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('drawer', 'sample-preview');
      next.set('contactId', contactId);
      return next;
    });
  const closePreview = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('drawer');
      next.delete('contactId');
      return next;
    });
  const changePreviewContact = (contactId: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('contactId', contactId);
      return next;
    });

  if (!template) {
    return <Banner tone="danger" title="No template selected" description="Go back to the Template step to choose an approved template before mapping variables." />;
  }

  if (templateVars.length === 0) {
    return (
      <div className="crm-camp-personalisation-step">
        <Banner tone="info" title="This template has no variables" description="Nothing to map — continue to Review & Launch." />
        <Button variant="secondary" iconLeft={<Eye />} onClick={() => openPreview(contacts[0]?.id ?? '')}>
          Preview sample message
        </Button>
        <SamplePreviewDrawer
          open={searchParams.get('drawer') === 'sample-preview'}
          contactId={searchParams.get('contactId')}
          draft={draft}
          onClose={closePreview}
          onChangeContact={changePreviewContact}
        />
      </div>
    );
  }

  const invalidNow = draft.audience.invalidPersonalisation;

  return (
    <div className="crm-camp-personalisation-step">
      {invalidNow > 0 ? (
        <Banner
          tone="warning"
          title={`${invalidNow.toLocaleString('en-IN')} recipients will be excluded`}
          description="They're missing data for a required variable and no fallback value is set. Add a fallback to keep them in the audience."
        />
      ) : null}

      {draft.variableMappings.map((mapping) => (
        <div key={mapping.variableIndex} className="crm-camp-personalisation-step__card">
          <div className="crm-camp-personalisation-step__card-head">
            <span className="crm-camp-personalisation-step__placeholder">{mapping.placeholder}</span>
            <span className="crm-camp-personalisation-step__description">{mapping.description}</span>
          </div>

          <div className="crm-camp-personalisation-step__row">
            <Select
              label="Source"
              options={sourceTypeOptions}
              value={mapping.sourceType}
              onChange={(e) => updateMapping(mapping.variableIndex, { sourceType: e.target.value as PersonalisationSourceType })}
            />

            {needsSourceField(mapping.sourceType) ? (
              mapping.sourceType === 'contact-field' ? (
                <Select
                  label="Field"
                  options={contactFieldOptions}
                  value={mapping.sourceField ?? 'name'}
                  onChange={(e) => updateMapping(mapping.variableIndex, { sourceField: e.target.value })}
                />
              ) : (
                <Input
                  label="Field key"
                  placeholder="e.g. loyaltyPoints"
                  value={mapping.sourceField ?? ''}
                  onChange={(e) => updateMapping(mapping.variableIndex, { sourceField: e.target.value })}
                />
              )
            ) : null}

            {needsFixedValue(mapping.sourceType) ? (
              <Input
                label={mapping.sourceType === 'fixed-value' ? 'Value' : 'Reference / URL'}
                placeholder={mapping.sourceType === 'dynamic-link' ? 'https://…' : 'Value'}
                value={mapping.fixedValue ?? ''}
                onChange={(e) => updateMapping(mapping.variableIndex, { fixedValue: e.target.value })}
              />
            ) : null}

            <Input
              label="Fallback value"
              placeholder="Used when data is missing"
              value={mapping.fallbackValue}
              onChange={(e) => updateMapping(mapping.variableIndex, { fallbackValue: e.target.value })}
            />
          </div>

          {mapping.missingCount > 0 ? (
            <p className="crm-camp-personalisation-step__issue">
              {mapping.missingCount.toLocaleString('en-IN')} recipients are missing this data
              {mapping.fallbackValue ? ' — fallback will be used.' : ' — set a fallback to avoid exclusion.'}
            </p>
          ) : null}
        </div>
      ))}

      <Button variant="secondary" iconLeft={<Eye />} onClick={() => openPreview(contacts[0]?.id ?? '')}>
        Preview with a sample recipient
      </Button>

      <SamplePreviewDrawer
        open={searchParams.get('drawer') === 'sample-preview'}
        contactId={searchParams.get('contactId')}
        draft={draft}
        onClose={closePreview}
        onChangeContact={changePreviewContact}
      />
    </div>
  );
}
