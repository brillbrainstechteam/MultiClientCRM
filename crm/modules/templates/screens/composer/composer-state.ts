import type { BusinessUseCase, MetaCategory, TemplateComponents, TemplateFormat } from '../../domain/types';
import { findTemplate, templatesByFamily } from '../../data/mockTemplates';
import { findLibraryItem } from '../../data/mockLibrary';
import { recommendedCategory } from '../../templates-labels';

/** Editable draft shape — a subset of `Template`, plus wizard-only bookkeeping. */
export interface ComposerDraft {
  name: string;
  useCase: BusinessUseCase;
  metaCategory: MetaCategory;
  categoryConfirmedByUser: boolean;
  locale: string;
  localeLabel: string;
  writingStyle: 'standard' | 'hinglish';
  format: TemplateFormat;
  components: TemplateComponents;
  wabaId: string;
  tags: string[];
  folder?: string;
  /** Populated when editing/fixing an existing record; undefined for a brand new template. */
  editingTemplateId?: string;
  familyId?: string;
}

export const localeOptions = [
  { value: 'en_US', label: 'English (US)' },
  { value: 'hi_IN', label: 'Hindi' },
  { value: 'mr_IN', label: 'Marathi' },
  { value: 'gu_IN', label: 'Gujarati' },
  { value: 'ta_IN', label: 'Tamil' },
  { value: 'kn_IN', label: 'Kannada' },
  { value: 'bn_IN', label: 'Bengali' },
];

function emptyComponents(format: TemplateFormat): TemplateComponents {
  const base: TemplateComponents = {
    headerFormat: 'none',
    body: '',
    buttons: [],
    variables: [],
  };
  if (format === 'carousel') base.carouselCards = [];
  if (format === 'catalogue') base.catalogue = { connected: false, productIds: [] };
  if (format === 'authentication') base.authentication = { codeExpiryMinutes: 10, addSecurityDisclaimer: true };
  if (format === 'offer') base.offer = { couponCode: '', expiryLabel: '', offerText: '' };
  if (format === 'flow') base.flow = { connected: false };
  if (format === 'payment') base.payment = { available: false };
  return base;
}

export interface ComposerInit {
  source: string | null;
  cloneFrom: string | null;
  libraryId: string | null;
  familyId: string | null;
  templateId: string | null;
  requestedFormat: string | null;
  defaultWabaId: string;
}

export function initComposerDraft(init: ComposerInit): ComposerDraft {
  const requestedFormat = (init.requestedFormat as TemplateFormat | null) ?? 'standard';

  if (init.source === 'clone' && init.cloneFrom) {
    const original = findTemplate(init.cloneFrom);
    if (original) {
      return {
        name: `${original.name}_copy`,
        useCase: original.useCase,
        metaCategory: original.metaCategory,
        categoryConfirmedByUser: true,
        locale: original.locale,
        localeLabel: original.localeLabel,
        writingStyle: original.writingStyle ?? 'standard',
        format: original.format,
        components: structuredClone(original.components),
        wabaId: original.wabaId,
        tags: [...original.tags],
        folder: original.folder,
      };
    }
  }

  if (init.source === 'edit' && init.templateId) {
    const original = findTemplate(init.templateId);
    if (original) {
      return {
        name: original.name,
        useCase: original.useCase,
        metaCategory: original.metaCategory,
        categoryConfirmedByUser: true,
        locale: original.locale,
        localeLabel: original.localeLabel,
        writingStyle: original.writingStyle ?? 'standard',
        format: original.format,
        components: structuredClone(original.components),
        wabaId: original.wabaId,
        tags: [...original.tags],
        folder: original.folder,
        editingTemplateId: original.id,
        familyId: original.familyId,
      };
    }
  }

  if (init.source === 'library' && init.libraryId) {
    const item = findLibraryItem(init.libraryId);
    if (item) {
      return {
        name: '',
        useCase: item.useCase,
        metaCategory: item.category,
        categoryConfirmedByUser: true,
        locale: 'en_US',
        localeLabel: 'English (US)',
        writingStyle: 'standard',
        format: item.format,
        components: structuredClone(item.components),
        wabaId: init.defaultWabaId,
        tags: [],
      };
    }
  }

  if (init.source === 'language' && init.familyId) {
    const members = templatesByFamily(init.familyId);
    const base = members[0];
    if (base) {
      return {
        name: base.name.replace(/_[a-z]{2}$/i, ''),
        useCase: base.useCase,
        metaCategory: base.metaCategory,
        categoryConfirmedByUser: true,
        locale: '',
        localeLabel: '',
        writingStyle: 'standard',
        format: base.format,
        components: structuredClone(base.components),
        wabaId: base.wabaId,
        tags: [...base.tags],
        folder: base.folder,
        familyId: base.familyId,
      };
    }
  }

  const useCase: BusinessUseCase = 'promotion';
  return {
    name: '',
    useCase,
    metaCategory: recommendedCategory(useCase),
    categoryConfirmedByUser: false,
    locale: 'en_US',
    localeLabel: 'English (US)',
    writingStyle: 'standard',
    format: requestedFormat,
    components: emptyComponents(requestedFormat),
    wabaId: init.defaultWabaId,
    tags: [],
  };
}

export function draftForFormat(draft: ComposerDraft, format: TemplateFormat): ComposerDraft {
  if (draft.format === format) return draft;
  return { ...draft, format, components: { ...emptyComponents(format), body: draft.components.body, footer: draft.components.footer, headerFormat: draft.components.headerFormat, headerText: draft.components.headerText, headerMediaLabel: draft.components.headerMediaLabel, variables: draft.components.variables } };
}
