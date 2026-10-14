/**
 * Quick replies: the canned responses an agent drops into the composer.
 *
 * Worth being precise about what these are, because WhatsApp uses the phrase
 * "quick reply" for two unrelated things:
 *
 *  1. **Quick reply BUTTONS** — tappable buttons on an approved template or an
 *     interactive message. Those are Meta's, they go through template approval,
 *     and the customer taps them. Up to 10 per template, 25 characters each.
 *  2. **Quick replies** (this file) — saved text an *agent* inserts, the
 *     `/shortcut` feature of the WhatsApp Business app. Meta's Cloud API has no
 *     store for these at all: in the app they live on one device, cap out at 50
 *     and vanish with the phone. Held here instead, the team shares one set.
 *
 * A quick reply is sent as free-form session text, so it only works inside the
 * 24-hour customer service window. Outside it, an approved template is the only
 * way to reopen the conversation.
 */

/** WhatsApp Cloud API's limit for the body of a text message. */
export const WHATSAPP_TEXT_LIMIT = 4096;
/** Matches the shortcut length the WhatsApp Business app allows. */
export const SHORTCUT_MAX = 25;
/** Past this a canned reply reads as a wall of text on a phone. */
export const BODY_SOFT_LIMIT = 1024;

export const DEFAULT_CATEGORIES = [
  'Greetings', 'Pricing', 'Catalogue', 'Order status', 'Payment', 'Logistics',
  'Follow-up', 'Closing', 'General',
];

/**
 * Placeholders a quick reply may use. Positional `{{1}}` is kept because that is
 * what Meta templates use and people copy wording between the two; the named
 * forms are friendlier and are what the UI suggests.
 */
export const PLACEHOLDERS: { token: string; label: string; from: string }[] = [
  { token: '{{name}}', label: 'Customer name', from: 'contact.name' },
  { token: '{{company}}', label: 'Company', from: 'contact.company' },
  { token: '{{city}}', label: 'City', from: 'contact.city' },
  { token: '{{agent}}', label: 'Your name', from: 'the signed-in user' },
  { token: '{{business}}', label: 'Business name', from: 'the workspace' },
];

export interface QuickReplyContext {
  name?: string | null;
  company?: string | null;
  city?: string | null;
  agent?: string | null;
  business?: string | null;
}

/**
 * Fill the placeholders. An unknown value leaves a readable gap rather than the
 * raw token, because a message reading "Hi {{name}}" going to a customer is far
 * worse than one reading "Hi there".
 */
export function renderQuickReply(body: string, ctx: QuickReplyContext): string {
  const map: Record<string, string> = {
    name: ctx.name?.trim() || 'there',
    company: ctx.company?.trim() || 'your business',
    city: ctx.city?.trim() || '',
    agent: ctx.agent?.trim() || '',
    business: ctx.business?.trim() || '',
  };
  return body
    // {{1}} is the customer's name by the same convention templates use.
    .replace(/\{\{\s*1\s*\}\}/g, map.name)
    .replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (whole, key: string) => {
      const v = map[key.toLowerCase()];
      return v === undefined ? whole : v;
    })
    // Collapse the space an empty optional placeholder leaves behind.
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** Normalise a typed shortcut: no slash, lowercase, safe characters only. */
export function normaliseShortcut(raw: string): string {
  return String(raw ?? '')
    .trim()
    .replace(/^\/+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SHORTCUT_MAX);
}

export interface QuickReplyIssue { field: string; message: string }

/** Validate before save. Returns [] when the quick reply is usable. */
export function validateQuickReply(input: {
  shortcut: string; title: string; body: string;
}): QuickReplyIssue[] {
  const issues: QuickReplyIssue[] = [];
  const shortcut = normaliseShortcut(input.shortcut);

  if (!shortcut) {
    issues.push({ field: 'shortcut', message: 'Give it a shortcut, e.g. /timings.' });
  } else if (shortcut.length > SHORTCUT_MAX) {
    issues.push({ field: 'shortcut', message: `Shortcuts are at most ${SHORTCUT_MAX} characters.` });
  }
  if (!input.title?.trim()) {
    issues.push({ field: 'title', message: 'Give it a name so the team knows what it is.' });
  }
  const body = (input.body ?? '').trim();
  if (!body) {
    issues.push({ field: 'body', message: 'The reply text is empty.' });
  } else if (body.length > WHATSAPP_TEXT_LIMIT) {
    issues.push({
      field: 'body',
      message: `WhatsApp rejects a text message over ${WHATSAPP_TEXT_LIMIT} characters.`,
    });
  }
  // An unknown placeholder would be sent verbatim to a customer.
  const known = new Set([...PLACEHOLDERS.map((p) => p.token.replace(/[{}]/g, '')), '1']);
  for (const m of body.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) {
    if (!known.has(m[1].toLowerCase())) {
      issues.push({
        field: 'body',
        message: `{{${m[1]}}} is not a placeholder this CRM fills — it would be sent as written.`,
      });
    }
  }
  return issues;
}
