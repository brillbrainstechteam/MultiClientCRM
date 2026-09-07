import type { Template, TemplateComponents } from './types';

/**
 * Deterministic validation helpers (CODE_FIRST_ADAPTER.md "Validation
 * architecture"). Every issue carries a stable `sectionId` so the Preview &
 * Validation screen can focus the affected composer section on click.
 */
export type ValidationSectionId =
  | 'basics'
  | 'header'
  | 'body'
  | 'variables'
  | 'footer'
  | 'buttons'
  | 'carousel'
  | 'catalogue'
  | 'authentication'
  | 'offer'
  | 'flow'
  | 'payment';

export interface ValidationIssue {
  id: string;
  sectionId: ValidationSectionId;
  message: string;
}

export interface ValidationResult {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

const URL_RE = /^https?:\/\/[^\s]+$/i;
const PHONE_RE = /^\+?[0-9][0-9\s-]{6,}$/;

export function validateTemplate(
  template: Pick<Template, 'name' | 'format' | 'metaCategory' | 'components'>,
  existingNames: string[],
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const push = (list: ValidationIssue[], sectionId: ValidationSectionId, id: string, message: string) =>
    list.push({ id, sectionId, message });

  // Basics
  if (!template.name.trim()) {
    push(errors, 'basics', 'name-required', 'Template name is required.');
  } else if (!/^[a-z0-9_]+$/.test(template.name)) {
    push(errors, 'basics', 'name-format', 'Template name may only use lowercase letters, numbers and underscores.');
  } else if (existingNames.includes(template.name)) {
    push(errors, 'basics', 'name-conflict', `A template named "${template.name}" already exists for this account.`);
  }

  const c = template.components;

  // Header
  if (c.headerFormat === 'text' && !c.headerText?.trim()) {
    push(errors, 'header', 'header-text-required', 'Header text is empty.');
  }
  if ((c.headerFormat === 'image' || c.headerFormat === 'video' || c.headerFormat === 'document') && !c.headerMediaLabel) {
    push(errors, 'header', 'header-media-required', 'Upload header media before submitting.');
  }

  // Body
  if (!c.body.trim()) {
    push(errors, 'body', 'body-required', 'Body content is required.');
  } else if (c.body.length > 1024) {
    push(errors, 'body', 'body-length', 'Body exceeds the 1,024 character limit.');
  }
  if (c.body.length > 700) {
    push(warnings, 'body', 'body-length-warning', 'Long bodies are more likely to be trimmed in preview on some devices.');
  }

  // Variables
  const bodyVariableIndexes = [...c.body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
  for (const index of bodyVariableIndexes) {
    const declared = c.variables.find((v) => v.index === index);
    if (!declared) {
      push(errors, 'variables', `variable-missing-${index}`, `{{${index}}} is used in the body but has no sample value.`);
    } else if (!declared.sampleValue.trim()) {
      push(errors, 'variables', `variable-sample-${index}`, `Variable {{${index}}} needs a sample value.`);
    }
  }

  // Footer
  if (c.footer && c.footer.length > 60) {
    push(errors, 'footer', 'footer-length', 'Footer exceeds the 60 character limit.');
  }

  // Buttons
  if (c.buttons.length > 10) {
    push(errors, 'buttons', 'buttons-count', 'A template may not have more than 10 buttons.');
  }
  const quickReplyCount = c.buttons.filter((b) => b.type === 'quick-reply').length;
  const ctaButtons = c.buttons.filter((b) => b.type !== 'quick-reply');
  if (quickReplyCount > 0 && ctaButtons.length > 0 && template.format === 'standard') {
    push(warnings, 'buttons', 'buttons-mixed', 'Mixing Quick Reply with call-to-action buttons changes button ordering on some clients.');
  }
  for (const button of c.buttons) {
    if ((button.type === 'website' || button.type === 'dynamic-website') && button.value && !URL_RE.test(button.value)) {
      push(errors, 'buttons', `button-url-${button.id}`, `"${button.label}" needs a valid https:// URL.`);
    }
    if (button.type === 'call-phone' && button.value && !PHONE_RE.test(button.value)) {
      push(errors, 'buttons', `button-phone-${button.id}`, `"${button.label}" needs a valid phone number.`);
    }
    if (button.type === 'coupon' && !button.value?.trim()) {
      push(errors, 'buttons', `button-coupon-${button.id}`, `"${button.label}" needs a coupon code.`);
    }
    if (!button.label.trim()) {
      push(errors, 'buttons', `button-label-${button.id}`, 'Every button needs a label.');
    }
  }

  // Format-specific
  if (template.format === 'carousel') {
    const cards = c.carouselCards ?? [];
    if (cards.length < 2) {
      push(errors, 'carousel', 'carousel-min-cards', 'A carousel needs at least 2 cards.');
    }
    if (cards.length > 10) {
      push(errors, 'carousel', 'carousel-max-cards', 'A carousel may not have more than 10 cards.');
    }
    cards.forEach((card, i) => {
      if (!card.mediaLabel) push(errors, 'carousel', `carousel-media-${card.id}`, `Card ${i + 1} needs media.`);
      if (!card.body.trim()) push(errors, 'carousel', `carousel-body-${card.id}`, `Card ${i + 1} needs body text.`);
    });
  }

  if (template.format === 'catalogue') {
    if (!c.catalogue?.connected) {
      push(errors, 'catalogue', 'catalogue-disconnected', 'Connect a product catalogue before submitting this template.');
    } else if (!c.catalogue.productIds.length) {
      push(errors, 'catalogue', 'catalogue-products', 'Select at least one product.');
    }
  }

  if (template.format === 'authentication') {
    if (template.metaCategory !== 'authentication') {
      push(errors, 'authentication', 'authentication-category', 'Authentication templates must use the Authentication Meta category.');
    }
    if (!c.authentication) {
      push(errors, 'authentication', 'authentication-config', 'Configure the authentication code settings.');
    }
  }

  if (template.format === 'offer') {
    if (!c.offer?.couponCode.trim()) {
      push(errors, 'offer', 'offer-coupon', 'Enter a coupon code or offer identifier.');
    }
    if (!c.offer?.expiryLabel.trim()) {
      push(warnings, 'offer', 'offer-expiry', 'Add an expiry so customers know the offer window.');
    }
  }

  if (template.format === 'flow') {
    if (!c.flow?.connected || !c.flow.flowId) {
      push(errors, 'flow', 'flow-missing', 'Select an existing Flow before submitting.');
    }
  }

  if (template.format === 'payment') {
    if (!c.payment?.available) {
      push(errors, 'payment', 'payment-unavailable', 'Payment/checkout is not available on this account yet.');
    }
  }

  // Category/content mismatch (non-blocking guidance)
  if (template.metaCategory === 'utility' && /\b(sale|off|discount|% off|festive)\b/i.test(c.body)) {
    push(warnings, 'body', 'category-mismatch', 'This body reads like marketing content — consider the Marketing category instead of Utility.');
  }

  return { errors, warnings };
}

export function characterCount(components: TemplateComponents): number {
  return components.body.length;
}

export function variableCount(components: TemplateComponents): number {
  return components.variables.length;
}
