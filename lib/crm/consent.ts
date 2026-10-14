import { prisma } from '@/lib/db';

/**
 * Consent is the gate on every business-initiated WhatsApp message, so it is
 * modelled as a small state machine rather than a flag:
 *
 *   never_asked ──request──▶ awaiting_reply ──reply──▶ opted_in | opted_out
 *        │                         │
 *        └──── manual capture ─────┴──────────────────▶ opted_in | opted_out
 *
 * `CrmContact.consent` stores the decision ('pending' | 'opted-in' |
 * 'opted-out'); `consentRequestedAt` separates "asked and waiting" from "never
 * asked", which is the difference between chasing a reply and sending a first
 * request. Every transition also appends a CrmConsentEvent, because what Meta
 * and GDPR actually ask for is evidence: channel, timestamp and the wording the
 * customer agreed to.
 *
 * Why this matters commercially: blocks and reports — not rejections at review
 * — are what sink a number's quality rating, and the biggest driver of both is
 * messaging people who never agreed to hear from you, with no way to stop it.
 */

export const CONSENT_OPTED_IN = 'opted-in';
export const CONSENT_OPTED_OUT = 'opted-out';
export const CONSENT_PENDING = 'pending';

export type ConsentDecision = 'in' | 'out';

export type ConsentStage =
  | 'opted_in'
  | 'opted_out'
  | 'awaiting_reply'
  | 'request_expired'
  | 'never_asked';

/**
 * How long a sent request is still "awaiting a reply". After this it moves to
 * request_expired so it can be re-asked without looking like a fresh contact —
 * re-asking the same person every week is exactly what drives blocks.
 */
export const REQUEST_WINDOW_DAYS = 7;

/** Don't ask the same contact again within this window. */
export const REASK_COOLDOWN_DAYS = 30;

export interface ConsentStageInput {
  consent: string;
  consentRequestedAt: Date | null;
}

export function consentStage(c: ConsentStageInput, now = new Date()): ConsentStage {
  if (c.consent === CONSENT_OPTED_IN) return 'opted_in';
  if (c.consent === CONSENT_OPTED_OUT) return 'opted_out';
  if (!c.consentRequestedAt) return 'never_asked';
  const ageDays = (now.getTime() - c.consentRequestedAt.getTime()) / 86_400_000;
  return ageDays <= REQUEST_WINDOW_DAYS ? 'awaiting_reply' : 'request_expired';
}

export const STAGE_LABEL: Record<ConsentStage, string> = {
  opted_in: 'Opted in',
  opted_out: 'Opted out',
  awaiting_reply: 'Awaiting reply',
  request_expired: 'No reply',
  never_asked: 'Never asked',
};

/* ---- Reply classification ------------------------------------------------ */

/**
 * Opt-out words are honoured on any inbound message, always. Meta expects STOP
 * to work whether or not we asked anything, and a customer who cannot stop you
 * blocks you instead — which costs the number's quality rating.
 *
 * Hindi/Hinglish matters here: this CRM's customers are Indian jewellery
 * retailers, and "band karo" is how people actually say stop.
 */
const OPT_OUT_PHRASES = [
  'stop', 'unsubscribe', 'opt out', 'optout', 'opt-out', 'remove me', 'unsub',
  'do not message', 'dont message', "don't message", 'no more messages',
  'band karo', 'band kar', 'band kro', 'bandh karo', 'mat bhejo', 'message mat',
  'नहीं चाहिए', 'बंद करो', 'मत भेजो',
];

/**
 * Opt-in words are only honoured while a request is outstanding. A bare "yes"
 * in the middle of a price negotiation is not marketing consent, and treating
 * it as such is how a CRM manufactures consent it cannot defend.
 */
const OPT_IN_PHRASES = [
  'yes', 'yes please', 'y', 'ok', 'okay', 'sure', 'start', 'subscribe',
  'i agree', 'agree', 'confirm', 'confirmed', 'please do', 'go ahead',
  'haan', 'haa', 'han', 'ha ji', 'haan ji', 'theek hai', 'thik hai', 'ji haan',
  'हाँ', 'हां', 'ठीक है', 'जी हाँ',
];

/** Quick-reply payloads we ask template authors to use (see CONSENT_TEMPLATE). */
export const CONSENT_PAYLOAD_IN = 'CONSENT_YES';
export const CONSENT_PAYLOAD_OUT = 'CONSENT_NO';

function normalise(s: string): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^\p{L}\p{N}'\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ReplyInput {
  /** Free text of the inbound message, if any. */
  text?: string | null;
  /** Quick-reply payload or button text from a template button press. */
  buttonPayload?: string | null;
  /** True when this contact has an outstanding consent request. */
  requestPending?: boolean;
}

export interface ReplyClassification {
  decision: ConsentDecision | null;
  channel: 'whatsapp_button' | 'whatsapp_keyword' | null;
  /** The matched word/payload, kept for the ledger. */
  matched: string | null;
}

/**
 * Decide whether an inbound message is a consent answer.
 *
 * A button press is authoritative — the customer tapped an option we wrote. A
 * keyword is authoritative only for opting out; for opting in it counts only
 * while a request is pending, and only when the whole message is the agreement
 * (so "yes, send me the 22k rates" does not become a marketing opt-in).
 */
export function classifyConsentReply(input: ReplyInput): ReplyClassification {
  const payload = normalise(input.buttonPayload ?? '');
  if (payload) {
    const p = payload.replace(/\s+/g, '_');
    if (p === normalise(CONSENT_PAYLOAD_IN).replace(/\s+/g, '_') || /^(yes|consent_yes|opt_in|subscribe)/.test(p)) {
      return { decision: 'in', channel: 'whatsapp_button', matched: input.buttonPayload ?? null };
    }
    if (p === normalise(CONSENT_PAYLOAD_OUT).replace(/\s+/g, '_') || /^(no|consent_no|opt_out|stop|unsubscribe)/.test(p)) {
      return { decision: 'out', channel: 'whatsapp_button', matched: input.buttonPayload ?? null };
    }
  }

  const text = normalise(input.text ?? '');
  if (!text) return { decision: null, channel: null, matched: null };

  // Opt-out: a phrase anywhere in the message is enough. Erring towards
  // stopping is always the safe error.
  for (const phrase of OPT_OUT_PHRASES) {
    const p = normalise(phrase);
    if (text === p || new RegExp(`(^|\\s)${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`).test(text)) {
      return { decision: 'out', channel: 'whatsapp_keyword', matched: phrase };
    }
  }

  // Opt-in: only an outstanding request, and only a whole-message agreement.
  if (input.requestPending && OPT_IN_PHRASES.map(normalise).includes(text)) {
    return { decision: 'in', channel: 'whatsapp_keyword', matched: text };
  }

  return { decision: null, channel: null, matched: null };
}

/* ---- Recording ----------------------------------------------------------- */

export type ConsentChannel =
  | 'whatsapp_button' | 'whatsapp_keyword' | 'whatsapp_reply'
  | 'web_form' | 'call' | 'in_store' | 'import' | 'manual';

export interface RecordConsentInput {
  tenantId: string;
  contactId: string;
  mobile: string;
  decision: ConsentDecision;
  channel: ConsentChannel;
  /** Campaign name, agent note, form URL — whatever identifies the moment. */
  source?: string | null;
  /** The exact copy the customer agreed to, or the template name. */
  wording?: string | null;
  /** The user who recorded it; null when the customer drove it. */
  actorId?: string | null;
  waMessageId?: string | null;
  reason?: string | null;
  at?: Date;
}

/**
 * Apply a consent decision to the contact and append the evidence. Both writes
 * go in one transaction: a decision without its ledger row is unprovable, and a
 * ledger row without the decision silently keeps messaging someone.
 */
export async function recordConsent(input: RecordConsentInput): Promise<void> {
  const at = input.at ?? new Date();
  const optingIn = input.decision === 'in';

  await prisma.$transaction([
    prisma.crmContact.update({
      where: { id: input.contactId },
      data: optingIn
        ? {
            consent: CONSENT_OPTED_IN,
            consentOptInAt: at,
            consentOptInSource: input.channel,
            consentWording: input.wording ?? undefined,
            consentOptOutAt: null,
            consentOptOutReason: null,
            lastActivityAt: at,
          }
        : {
            consent: CONSENT_OPTED_OUT,
            consentOptOutAt: at,
            consentOptOutReason: input.reason ?? input.channel,
            lastActivityAt: at,
          },
    }),
    prisma.crmConsentEvent.create({
      data: {
        tenantId: input.tenantId,
        contactId: input.contactId,
        mobile: input.mobile,
        event: optingIn ? 'opted_in' : 'opted_out',
        channel: input.channel,
        source: input.source ?? null,
        wording: input.wording ?? null,
        actorId: input.actorId ?? null,
        waMessageId: input.waMessageId ?? null,
        at,
      },
    }),
  ]);
}

/** Stamp that a request went out, so the funnel can tell asked from un-asked. */
export async function recordConsentRequest(input: {
  tenantId: string;
  contactId: string;
  mobile: string;
  templateName: string;
  wording?: string | null;
  actorId?: string | null;
  waMessageId?: string | null;
  source?: string | null;
}): Promise<void> {
  const at = new Date();
  await prisma.$transaction([
    prisma.crmContact.update({
      where: { id: input.contactId },
      data: {
        consentRequestedAt: at,
        consentRequestWaId: input.waMessageId ?? null,
        consentWording: input.wording ?? input.templateName,
      },
    }),
    prisma.crmConsentEvent.create({
      data: {
        tenantId: input.tenantId,
        contactId: input.contactId,
        mobile: input.mobile,
        event: 'requested',
        channel: 'whatsapp_button',
        source: input.source ?? input.templateName,
        wording: input.wording ?? input.templateName,
        actorId: input.actorId ?? null,
        waMessageId: input.waMessageId ?? null,
        at,
      },
    }),
  ]);
}

/* ---- Audience helpers ---------------------------------------------------- */

/**
 * Contacts that may receive a MARKETING template. Utility templates ride on a
 * different basis (an existing order/transaction), so they are not gated here.
 */
export const marketingEligibleWhere = { consent: CONSENT_OPTED_IN } as const;

/** Never message these, whatever the category. */
export const suppressedWhere = { consent: CONSENT_OPTED_OUT } as const;

/**
 * Who to ask next: not opted in, not opted out, and not asked recently. The
 * cooldown is the part that protects the number — re-asking weekly reads as
 * spam to both the customer and Meta.
 */
export function needsConsentWhere(tenantId: string, now = new Date()) {
  const cooldown = new Date(now.getTime() - REASK_COOLDOWN_DAYS * 86_400_000);
  return {
    tenantId,
    consent: { notIn: [CONSENT_OPTED_IN, CONSENT_OPTED_OUT] },
    OR: [{ consentRequestedAt: null }, { consentRequestedAt: { lt: cooldown } }],
  };
}

export interface ConsentFunnel {
  total: number;
  optedIn: number;
  optedOut: number;
  awaitingReply: number;
  noReply: number;
  neverAsked: number;
  /** Ready to be asked now (never asked, or past the re-ask cooldown). */
  askable: number;
}

/** Counts for the consent dashboard, in one round trip per bucket. */
export async function consentFunnel(tenantId: string, now = new Date()): Promise<ConsentFunnel> {
  const window = new Date(now.getTime() - REQUEST_WINDOW_DAYS * 86_400_000);
  const cooldown = new Date(now.getTime() - REASK_COOLDOWN_DAYS * 86_400_000);
  const undecided = { tenantId, consent: { notIn: [CONSENT_OPTED_IN, CONSENT_OPTED_OUT] } };

  const [total, optedIn, optedOut, awaitingReply, noReply, neverAsked, askable] = await Promise.all([
    prisma.crmContact.count({ where: { tenantId } }),
    prisma.crmContact.count({ where: { tenantId, consent: CONSENT_OPTED_IN } }),
    prisma.crmContact.count({ where: { tenantId, consent: CONSENT_OPTED_OUT } }),
    prisma.crmContact.count({ where: { ...undecided, consentRequestedAt: { gte: window } } }),
    prisma.crmContact.count({ where: { ...undecided, consentRequestedAt: { lt: window } } }),
    prisma.crmContact.count({ where: { ...undecided, consentRequestedAt: null } }),
    prisma.crmContact.count({ where: needsConsentWhere(tenantId, now) }),
  ]);

  return { total, optedIn, optedOut, awaitingReply, noReply, neverAsked, askable };
}

/* ---- Template guidance --------------------------------------------------- */

/**
 * The consent request we recommend, written to survive Meta review and to read
 * as a service message rather than an ad. The rules it follows, all of which
 * come out of how Meta scores templates and numbers:
 *
 *  - Name the business and name WhatsApp, so the agreement is channel-specific.
 *  - Say what will arrive and roughly how often, so later sends match the promise.
 *  - Two quick-reply buttons, so opting out is one tap — not a block.
 *  - Submit as UTILITY only if it genuinely follows a transaction; otherwise
 *    MARKETING is the honest category, and a mis-categorised template is the
 *    most common rejection reason.
 *  - No price, no offer, no emoji wall in the first 60 characters, which is all
 *    the customer sees in their notification.
 */
export const CONSENT_TEMPLATE = {
  suggestedName: 'consent_opt_in_v1',
  category: 'MARKETING' as const,
  language: 'en',
  body:
    'Hello {{1}}, this is {{2}} on WhatsApp. May we send you new design '
    + 'catalogues, stock updates and festive collections here — around 2-4 '
    + 'messages a month? You can stop any time by replying STOP.',
  bodyExample: ['Rajesh', 'Shree Jewellers'],
  footer: 'Reply STOP to opt out at any time.',
  buttons: [
    { type: 'QUICK_REPLY' as const, text: 'Yes, keep me updated', payload: CONSENT_PAYLOAD_IN },
    { type: 'QUICK_REPLY' as const, text: 'No thanks', payload: CONSENT_PAYLOAD_OUT },
  ],
};

export interface ConsentRule { title: string; detail: string }

/** Shown beside the consent screen so the operator understands the rules. */
export const CONSENT_RULES: ConsentRule[] = [
  {
    title: 'Name the business and the channel',
    detail: 'The request must say who is writing and that the messages come on WhatsApp. A general "we may contact you" is not a WhatsApp opt-in.',
  },
  {
    title: 'Say what arrives, and how often',
    detail: 'Set the expectation in the request ("2-4 messages a month"), then keep to it. Sends that exceed the promise are what trigger blocks.',
  },
  {
    title: 'Make stopping one tap',
    detail: 'Give a quick-reply button and honour STOP as text. A customer with no way out blocks the number instead, and blocks are what lower the quality rating.',
  },
  {
    title: 'Pick the honest category',
    detail: 'Promotional content inside a UTILITY template is the most common rejection, and it gets re-categorised after approval anyway.',
  },
  {
    title: 'Keep the evidence',
    detail: 'Every opt-in here stores the channel, timestamp and the exact wording shown. That record is what answers a complaint or an audit.',
  },
  {
    title: 'Never re-ask immediately',
    detail: `A contact who has not replied is left alone for ${REASK_COOLDOWN_DAYS} days before the list offers them again.`,
  },
];
