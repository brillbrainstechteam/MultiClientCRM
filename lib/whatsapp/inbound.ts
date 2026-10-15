/**
 * Turning an inbound WhatsApp message into something an agent can read.
 *
 * Every type that is not plain text used to land in the thread as `[location]`
 * or `[contacts]` — technically accurate and completely useless. A jeweller
 * seeing "[location]" cannot tell whether the customer sent their shop address
 * or asked to meet somewhere; "[order]" hides what they wanted to buy.
 *
 * So each type is rendered into a sentence, and the structured parts worth
 * keeping (media id, coordinates, filename) come back alongside for the caller
 * to store in their own columns.
 *
 * Pure: no database, no network, no token. That makes every branch testable
 * against a real payload shape.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface InboundDescription {
  /** What to show in the thread. Never empty. */
  text: string;
  /** Meta's media id, when the message carries an attachment. */
  mediaId: string | null;
  /** Meta's declared filename, for documents. */
  fileName: string | null;
  latitude: number | null;
  longitude: number | null;
}

const empty: Omit<InboundDescription, 'text'> = {
  mediaId: null, fileName: null, latitude: null, longitude: null,
};

const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : null;

export function describeInbound(m: any): InboundDescription {
  const type: string = m?.type ?? 'text';

  switch (type) {
    case 'text':
      return { text: str(m?.text?.body) ?? '', ...empty };

    // ---- Media. The caption is the message; the file is the attachment. ----
    case 'image':
    case 'video':
    case 'audio':
    case 'voice':
    case 'document':
    case 'sticker': {
      const node = m?.[type] ?? {};
      const fileName = str(node.filename);
      const caption = str(node.caption);
      const noun = type === 'image' ? 'Photo'
        : type === 'video' ? 'Video'
        : type === 'audio' || type === 'voice' ? 'Voice message'
        : type === 'sticker' ? 'Sticker'
        : 'Document';
      return {
        // A caption reads better than a label, so prefer it when there is one.
        text: caption ?? (fileName ? `${noun}: ${fileName}` : noun),
        mediaId: str(node.id),
        fileName,
        ...{ latitude: null, longitude: null },
      };
    }

    // ---- Location: the whole point is where, so say where. -----------------
    case 'location': {
      const loc = m?.location ?? {};
      const name = str(loc.name);
      const address = str(loc.address);
      const lat = typeof loc.latitude === 'number' ? loc.latitude : null;
      const lng = typeof loc.longitude === 'number' ? loc.longitude : null;
      const where = [name, address].filter(Boolean).join(', ');
      return {
        text: where
          ? `Location: ${where}`
          : lat !== null && lng !== null
            ? `Location: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
            : 'Location shared',
        mediaId: null,
        fileName: null,
        latitude: lat,
        longitude: lng,
      };
    }

    // ---- A shared contact card — often a referral worth acting on. ---------
    case 'contacts': {
      const list: any[] = Array.isArray(m?.contacts) ? m.contacts : [];
      const names = list
        .map((c) => str(c?.name?.formatted_name) ?? str(c?.name?.first_name))
        .filter(Boolean);
      const phones = list
        .flatMap((c) => (Array.isArray(c?.phones) ? c.phones : []))
        .map((p: any) => str(p?.phone))
        .filter(Boolean);
      if (!names.length && !phones.length) return { text: 'Contact shared', ...empty };
      const who = names.length ? names.join(', ') : phones.join(', ');
      // The number is the actionable part, so keep it visible.
      const detail = names.length && phones.length ? ` (${phones.join(', ')})` : '';
      return { text: `Shared contact: ${who}${detail}`, ...empty };
    }

    // ---- A tap on a template or interactive button. ------------------------
    case 'button': {
      const label = str(m?.button?.text) ?? str(m?.button?.payload);
      return { text: label ? `Tapped: ${label}` : 'Tapped a button', ...empty };
    }
    case 'interactive': {
      const i = m?.interactive ?? {};
      // An answer to "may we call you?" reads as what the customer decided,
      // not as "Made a selection", which tells the agent nothing.
      if (i?.type === 'call_permission_reply') {
        const r = i.call_permission_reply ?? {};
        if (String(r?.response).toLowerCase() === 'accept') {
          return {
            text: r?.is_permanent === true
              ? 'Allowed WhatsApp calls'
              : 'Allowed WhatsApp calls for the next 7 days',
            ...empty,
          };
        }
        return { text: 'Declined WhatsApp calls', ...empty };
      }
      const label = str(i?.button_reply?.title) ?? str(i?.list_reply?.title)
        ?? str(i?.nfm_reply?.name);
      return { text: label ? `Chose: ${label}` : 'Made a selection', ...empty };
    }

    // ---- A reaction is about another message, not a message in itself. -----
    case 'reaction': {
      const emoji = str(m?.reaction?.emoji);
      // An empty emoji means the reaction was removed.
      return { text: emoji ? `Reacted ${emoji}` : 'Removed a reaction', ...empty };
    }

    // ---- Commerce. ---------------------------------------------------------
    case 'order': {
      const items: any[] = Array.isArray(m?.order?.product_items) ? m.order.product_items : [];
      const count = items.length;
      const total = items.reduce(
        (sum, it) => sum + (Number(it?.item_price) || 0) * (Number(it?.quantity) || 0),
        0,
      );
      const currency = str(items[0]?.currency) ?? '';
      const money = total > 0 ? ` — ${currency} ${total.toLocaleString('en-IN')}` : '';
      return {
        text: count
          ? `Order: ${count} item${count === 1 ? '' : 's'}${money}`
          : 'Order placed',
        ...empty,
      };
    }

    // ---- Meta could not deliver the content (often an unsupported type). ---
    case 'unsupported': {
      const reason = str(m?.errors?.[0]?.title) ?? str(m?.errors?.[0]?.message);
      return {
        text: reason
          ? `Unsupported message — ${reason}`
          : 'Message type not supported by WhatsApp Business',
        ...empty,
      };
    }

    case 'system': {
      // e.g. the customer moved to a new number: worth seeing, never silent.
      const body = str(m?.system?.body);
      return { text: body ?? 'WhatsApp system update', ...empty };
    }

    default:
      return { text: str(m?.text?.body) ?? `Unrecognised message (${type})`, ...empty };
  }
}
