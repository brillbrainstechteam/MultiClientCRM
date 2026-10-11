import type { BusinessUseCase, MetaCategory, TemplateComponents, TemplateFormat } from '../../domain/types';
import { findTemplate, templatesByFamily } from '../../data/mockTemplates';
import { findLibraryItem } from '../../data/mockLibrary';
import { STARTER_TEMPLATES } from '../../data/starter-library';
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

// Codes are Meta's exact WhatsApp template language codes (supported-languages
// doc). Indian languages use the 2-letter code (hi, not hi_IN); submitting
// hi_IN etc. is rejected by Meta. Indian + English first, then international.
export const localeOptions = [
  { value: 'en', label: 'English' },
  { value: 'en_US', label: 'English (US)' },
  { value: 'en_GB', label: 'English (UK)' },
  { value: 'en_IN', label: 'English (India)' },
  { value: 'hi', label: 'Hindi' },
  { value: 'bn', label: 'Bengali' },
  { value: 'gu', label: 'Gujarati' },
  { value: 'kn', label: 'Kannada' },
  { value: 'ml', label: 'Malayalam' },
  { value: 'mr', label: 'Marathi' },
  { value: 'pa', label: 'Punjabi' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'ur', label: 'Urdu' },
  { value: 'ar', label: 'Arabic' },
  { value: 'zh_CN', label: 'Chinese (Simplified)' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'id', label: 'Indonesian' },
  { value: 'it', label: 'Italian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'pt_BR', label: 'Portuguese (Brazil)' },
  { value: 'ru', label: 'Russian' },
  { value: 'es', label: 'Spanish' },
  { value: 'es_MX', label: 'Spanish (Mexico)' },
  { value: 'th', label: 'Thai' },
  { value: 'tr', label: 'Turkish' },
  { value: 'vi', label: 'Vietnamese' },
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
  starterId: string | null;
  familyId: string | null;
  templateId: string | null;
  requestedFormat: string | null;
  defaultWabaId: string;
}

export function initComposerDraft(init: ComposerInit): ComposerDraft {
  const requestedFormat = (init.requestedFormat as TemplateFormat | null) ?? 'standard';

  // A marketing-dept ready template (starter library): open the FULL composer
  // pre-filled with its body, so every option (header, buttons, footer,
  // variables, category, language) is available just like a new template.
  if (init.source === 'starter' && init.starterId) {
    const starter = STARTER_TEMPLATES.find((s) => s.suggestedName === init.starterId);
    if (starter) {
      return {
        name: starter.suggestedName,
        useCase: 'other',
        metaCategory: 'marketing',
        categoryConfirmedByUser: false,
        locale: 'en',
        localeLabel: 'English',
        writingStyle: 'standard',
        format: 'standard',
        components: { headerFormat: 'none', body: starter.body, footer: undefined, buttons: [], variables: [] },
        wabaId: init.defaultWabaId,
        tags: [],
      };
    }
  }

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
