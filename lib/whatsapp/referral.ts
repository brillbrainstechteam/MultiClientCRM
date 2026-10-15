import { prisma } from '@/lib/db';

/**
 * Click-to-WhatsApp attribution.
 *
 * When someone taps an ad that opens WhatsApp, their first message arrives on
 * the ordinary `messages` webhook carrying a `referral` object. No extra
 * product or permission is needed to *receive* it — Meta's payload reference
 * says messages sent "directly, via an ad, or via a UI component" share one
 * structure. The CTWA product in Embedded Signup is about *managing* the
 * customer's ads, which is a different thing.
 *
 * Why this matters more than it looks: for a retailer running Instagram ads,
 * this object is the only link between money spent and a customer who walked in
 * through the door. Discarded, every ad-driven lead looks identical to a
 * walk-in, and the ad spend cannot be judged.
 *
 * Two rules:
 *
 *  - **The message keeps the object verbatim.** Meta has added fields over time
 *    (`ctwa_clid` arrived later), and attribution cannot be rebuilt afterwards,
 *    so nothing is thrown away in parsing.
 *  - **The contact keeps first touch.** A later click is recorded on its own
 *    message, but the contact keeps the ad that originally won them. Overwriting
 *    would quietly re-credit a customer to whichever ad they most recently
 *    clicked, which is how attribution turns into fiction.
 */

export interface Referral {
  source_url?: string;
  source_id?: string;
  /** `ad` or `post`. */
  source_type?: string;
  headline?: string;
  body?: string;
  media_type?: string;
  image_url?: string;
  video_url?: string;
  thumbnail_url?: string;
  /**
   * Click id. Needed to report a conversion back through Conversions API, so
   * it is worth keeping even before that is built. Meta omits it for messages
   * originating from an ad in WhatsApp Status.
   */
  ctwa_clid?: string;
  welcome_message?: unknown;
}

const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : null;

/** Pull the referral off an inbound message, if it carries one. */
export function readReferral(message: unknown): Referral | null {
  const m = (message ?? {}) as { referral?: unknown };
  const r = m.referral;
  if (!r || typeof r !== 'object') return null;
  // An empty object is not attribution.
  return Object.keys(r as object).length ? (r as Referral) : null;
}

/** One line an agent can read: "Diwali Collection — Instagram ad". */
export function describeReferral(r: Referral | null): string | null {
  if (!r) return null;
  const what = str(r.headline) ?? str(r.body);
  const kind = r.source_type === 'post' ? 'post' : 'ad';
  return what ? `${what} (${kind})` : `Click-to-WhatsApp ${kind}`;
}

/**
 * Stamp the contact with the ad that won them, if it has not been stamped.
 *
 * Returns true when the attribution was newly applied. Never throws: losing an
 * attribution stamp must not cost us the message itself.
 */
export async function applyReferralToContact(input: {
  tenantId: string;
  contactPhone: string;
  referral: Referral;
  at: Date;
}): Promise<boolean> {
  const { tenantId, referral, at } = input;
  const digits = input.contactPhone.replace(/\D/g, '');
  if (!digits) return false;

  const contact = await prisma.crmContact.findFirst({
    where: { tenantId, mobile: { in: [digits, `+${digits}`] } },
    select: { id: true, adSourceId: true, source: true },
  });
  if (!contact) return false;
  // First touch wins — see the note at the top of this file.
  if (contact.adSourceId) return false;

  await prisma.crmContact.update({
    where: { id: contact.id },
    data: {
      adSourceId: str(referral.source_id),
      adSourceType: str(referral.source_type),
      adSourceUrl: str(referral.source_url),
      adHeadline: str(referral.headline) ?? str(referral.body),
      ctwaClid: str(referral.ctwa_clid),
      adReferralAt: at,
      // Only fill the source when it is still the import-time default, so a
      // deliberately-set source is never overwritten by an ad click.
      ...(contact.source && contact.source !== 'Manual entry' && contact.source !== 'unknown'
        ? {}
        : { source: 'Click-to-WhatsApp ad' }),
      lastActivityAt: at,
    },
  });
  return true;
}
