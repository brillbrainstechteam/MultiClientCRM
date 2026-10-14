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
/** Header formats that carry an uploaded file (Meta: IMAGE, VIDEO, GIF, DOCUMENT). */
const MEDIA_HEADERS = new Set<string>(['image', 'video', 'gif', 'document']);
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

  // Header — Meta: one header per template; text ≤ 60 chars with at most ONE
  // parameter; media is IMAGE/VIDEO/GIF/DOCUMENT; a location header is allowed
  // only on UTILITY and MARKETING templates.
  if (c.headerFormat === 'text') {
    if (!c.headerText?.trim()) {
      push(errors, 'header', 'header-text-required', 'Header text is empty.');
    } else {
      if (c.headerText.length > 60) {
        push(errors, 'header', 'header-text-length', 'Header exceeds the 60 character limit.');
      }
      const headerParams = c.headerText.match(/\{\{\s*[a-zA-Z0-9_]+\s*\}\}/g) ?? [];
      if (headerParams.length > 1) {
        push(errors, 'header', 'header-params', 'A text header may contain only one variable.');
      }
    }
  }
  if (MEDIA_HEADERS.has(c.headerFormat) && !c.headerMediaLabel) {
    push(errors, 'header', 'header-media-required', 'Upload header media before submitting.');
  }
  if (c.headerFormat === 'gif' && template.metaCategory !== 'marketing') {
    push(errors, 'header', 'header-gif-category', 'GIF headers are only available on Marketing templates.');
  }
  if (c.headerFormat === 'location' && template.metaCategory === 'authentication') {
    push(errors, 'header', 'header-location-category', 'A location header is only allowed on Utility and Marketing templates.');
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
  // Meta: the footer is text only — a variable there is rejected at review.
  if (c.footer && /\{\{\s*[a-zA-Z0-9_]+\s*\}\}/.test(c.footer)) {
    push(errors, 'footer', 'footer-variables', 'Footers cannot contain variables — Meta allows plain text only.');
  }

  // Buttons — Meta's limits (templates/components): max 10 total; URL ≤ 2;
  // phone ≤ 1; copy-code ≤ 1; button text ≤ 25; URL ≤ 2000; phone ≤ 20.
  if (c.buttons.length > 10) {
    push(errors, 'buttons', 'buttons-count', 'A template may not have more than 10 buttons.');
  }
  const quickReplyCount = c.buttons.filter((b) => b.type === 'quick-reply').length;
  const urlCount = c.buttons.filter((b) => b.type === 'website' || b.type === 'dynamic-website').length;
  const phoneCount = c.buttons.filter((b) => b.type === 'call-phone').length;
  const couponCount = c.buttons.filter((b) => b.type === 'coupon').length;
  const ctaButtons = c.buttons.filter((b) => b.type !== 'quick-reply');
  if (quickReplyCount > 10) {
    push(errors, 'buttons', 'buttons-qr-count', 'Meta allows at most 10 quick-reply buttons.');
  }
  if (urlCount > 2) {
    push(errors, 'buttons', 'buttons-url-count', 'Meta allows at most 2 URL (website) buttons.');
  }
  if (phoneCount > 1) {
    push(errors, 'buttons', 'buttons-phone-count', 'Meta allows only 1 phone-number (call) button.');
  }
  if (couponCount > 1) {
    push(errors, 'buttons', 'buttons-coupon-count', 'Meta allows only 1 copy-code button.');
  }
  // Meta groups buttons strictly: every quick reply first, then every other
  // type. Interleaving them is rejected by the API outright, so this is an
  // error rather than the styling warning it used to be.
  if (quickReplyCount > 0 && ctaButtons.length > 0) {
    const firstCta = c.buttons.findIndex((b) => b.type !== 'quick-reply');
    const lastQuickReply = c.buttons.map((b) => b.type).lastIndexOf('quick-reply');
    if (firstCta !== -1 && lastQuickReply > firstCta) {
      push(errors, 'buttons', 'buttons-order', 'Meta rejects interleaved buttons — list every quick-reply button first, then the call-to-action buttons.');
    }
    push(warnings, 'buttons', 'buttons-mixed', 'Quick-reply and call-to-action buttons together do not render on WhatsApp Desktop.');
  }
  // Beyond three, WhatsApp shows two and hides the rest behind "See all options".
  if (c.buttons.length > 3) {
    push(warnings, 'buttons', 'buttons-overflow', `Only two of these ${c.buttons.length} buttons show on the phone — the rest sit behind "See all options", and none render on WhatsApp Desktop.`);
  }
  for (const button of c.buttons) {
    if ((button.type === 'website' || button.type === 'dynamic-website') && button.value && !URL_RE.test(button.value)) {
      push(errors, 'buttons', `button-url-${button.id}`, `"${button.label}" needs a valid https:// URL.`);
    }
    if ((button.type === 'website' || button.type === 'dynamic-website') && (button.value?.length ?? 0) > 2000) {
      push(errors, 'buttons', `button-url-len-${button.id}`, `"${button.label}" URL exceeds 2,000 characters.`);
    }
    if (button.type === 'call-phone' && button.value && !PHONE_RE.test(button.value)) {
      push(errors, 'buttons', `button-phone-${button.id}`, `"${button.label}" needs a valid phone number.`);
    }
    if (button.type === 'call-phone' && (button.value?.length ?? 0) > 20) {
      push(errors, 'buttons', `button-phone-len-${button.id}`, `"${button.label}" phone number exceeds 20 characters.`);
    }
    if (button.type === 'coupon' && !button.value?.trim()) {
      push(errors, 'buttons', `button-coupon-${button.id}`, `"${button.label}" needs a coupon code.`);
    }
    if (button.type === 'coupon' && (button.value?.length ?? 0) > 20) {
      push(errors, 'buttons', `button-coupon-len-${button.id}`, `"${button.label}" coupon code exceeds 20 characters.`);
    }
    // Meta allows one variable on a URL button and only at the very end, because
    // the value is appended to the URL rather than substituted into it.
    if (button.type === 'website' || button.type === 'dynamic-website') {
      const vars = button.value?.match(/\{\{\s*[a-zA-Z0-9_]+\s*\}\}/g) ?? [];
      if (vars.length > 1) {
        push(errors, 'buttons', `button-url-vars-${button.id}`, `"${button.label}" may contain only one variable.`);
      }
      if (vars.length === 1 && !button.value?.trimEnd().endsWith(vars[0])) {
        push(errors, 'buttons', `button-url-var-pos-${button.id}`, `"${button.label}" must end with its variable — Meta appends the value to the URL.`);
      }
    }
    if (!button.label.trim()) {
      push(errors, 'buttons', `button-label-${button.id}`, 'Every button needs a label.');
    } else if (button.label.length > 25) {
      push(errors, 'buttons', `button-label-len-${button.id}`, `"${button.label}" button text exceeds 25 characters.`);
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
