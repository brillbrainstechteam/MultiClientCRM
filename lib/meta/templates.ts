/**
 * Maps a TalkTrack template draft onto Meta's `message_templates` payload.
 *
 * Kept free of client imports so it can be unit-tested and reused. Anything
 * Meta would reject for a structural reason we can see up front (missing
 * variable samples, unsupported header media, bad names) fails here with a
 * plain-language message, instead of round-tripping to Graph for a cryptic one.
 */

export interface DraftButton {
  type: string;
  label: string;
  value?: string;
  dynamic?: boolean;
}

export interface DraftComponents {
  headerFormat: string;
  headerText?: string;
  body: string;
  footer?: string;
  buttons: DraftButton[];
  variables: Array<{ index: number; sampleValue: string }>;
  authentication?: { codeExpiryMinutes: number; addSecurityDisclaimer: boolean };
}

export interface TemplateDraftInput {
  name: string;
  locale: string;
  metaCategory: string;
  format: string;
  components: DraftComponents;
}

export interface MetaTemplatePayload {
  name: string;
  language: string;
  category: string;
  components: Array<Record<string, unknown>>;
}

/** A draft Meta would reject — the message is safe to show the user as-is. */
export class TemplateMappingError extends Error {}

const HAS_VARIABLE = /\{\{\d+\}\}/;

export function toMetaTemplate(input: TemplateDraftInput): MetaTemplatePayload {
  const name = (input.name ?? '').trim();
  if (!/^[a-z0-9_]{1,512}$/.test(name)) {
    throw new TemplateMappingError(
      'Template names can only use lowercase letters, numbers and underscores (for example order_update).',
    );
  }
  const language = (input.locale ?? '').trim();
  if (!language) throw new TemplateMappingError('Choose a language for the template.');

  const c = input.components;

  // Authentication templates have a fixed, Meta-defined shape: no free body text.
  if (input.format === 'authentication') {
    const auth = c.authentication ?? { codeExpiryMinutes: 10, addSecurityDisclaimer: true };
    return {
      name,
      language,
      category: 'AUTHENTICATION',
      components: [
        { type: 'BODY', add_security_recommendation: auth.addSecurityDisclaimer },
        { type: 'FOOTER', code_expiration_minutes: auth.codeExpiryMinutes },
        { type: 'BUTTONS', buttons: [{ type: 'OTP', otp_type: 'COPY_CODE' }] },
      ],
    };
  }

  if (input.format !== 'standard') {
    throw new TemplateMappingError(
      `${input.format.charAt(0).toUpperCase()}${input.format.slice(1)} templates can't be submitted from TalkTrack yet — use a standard or authentication template.`,
    );
  }

  const category = (input.metaCategory ?? '').toUpperCase();
  if (!['MARKETING', 'UTILITY', 'AUTHENTICATION'].includes(category)) {
    throw new TemplateMappingError('Choose a Meta category: marketing, utility or authentication.');
  }

  const components: Array<Record<string, unknown>> = [];

  if (c.headerFormat === 'text' && c.headerText?.trim()) {
    if (HAS_VARIABLE.test(c.headerText)) {
      throw new TemplateMappingError('Header variables are not supported yet — keep variables in the message body.');
    }
    components.push({ type: 'HEADER', format: 'TEXT', text: c.headerText.trim() });
  } else if (['image', 'video', 'document'].includes(c.headerFormat)) {
    throw new TemplateMappingError(
      `${/^[aeiou]/.test(c.headerFormat) ? 'An' : 'A'} ${c.headerFormat} header needs a sample file uploaded to Meta, which TalkTrack doesn't support yet — use a text header or none.`,
    );
  }

  const body = (c.body ?? '').trim();
  if (!body) throw new TemplateMappingError('The message body is empty.');

  // Meta reviews templates against example values, one per {{n}}, in order.
  const indices = [...new Set([...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);
  const bodyComponent: Record<string, unknown> = { type: 'BODY', text: body };
  if (indices.length) {
    const samples = indices.map((i) => {
      const sample = c.variables.find((v) => v.index === i)?.sampleValue?.trim();
      if (!sample) {
        throw new TemplateMappingError(`Add a sample value for {{${i}}} — Meta reviews templates using these examples.`);
      }
      return sample;
    });
    bodyComponent.example = { body_text: [samples] };
  }
  components.push(bodyComponent);

  if (c.footer?.trim()) components.push({ type: 'FOOTER', text: c.footer.trim() });

  if (c.buttons.length) components.push({ type: 'BUTTONS', buttons: c.buttons.map(toMetaButton) });

  return { name, language, category, components };
}

function toMetaButton(b: DraftButton): Record<string, unknown> {
  const text = (b.label ?? '').trim();
  const value = (b.value ?? '').trim();

  switch (b.type) {
    case 'quick-reply':
      if (!text) throw new TemplateMappingError('Every quick-reply button needs a label.');
      return { type: 'QUICK_REPLY', text };

    case 'website':
    case 'dynamic-website': {
      if (!value) throw new TemplateMappingError(`The "${text || 'website'}" button needs a URL.`);
      const dynamic = b.type === 'dynamic-website' || b.dynamic || HAS_VARIABLE.test(value);
      if (!dynamic) return { type: 'URL', text, url: value };
      // A dynamic URL carries its single variable at the end, plus a full example.
      const url = HAS_VARIABLE.test(value) ? value : `${value}{{1}}`;
      return { type: 'URL', text, url, example: [url.replace(/\{\{\d+\}\}/, 'example')] };
    }

    case 'call-phone':
      if (!value) throw new TemplateMappingError(`The "${text || 'call'}" button needs a phone number.`);
      return { type: 'PHONE_NUMBER', text, phone_number: value };

    case 'coupon':
      if (!value) throw new TemplateMappingError('The coupon button needs a coupon code.');
      return { type: 'COPY_CODE', example: value };

    default:
      throw new TemplateMappingError(`"${b.type}" buttons can't be submitted from TalkTrack yet — remove it or use another button type.`);
  }
}
