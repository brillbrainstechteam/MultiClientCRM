/**
 * Communication Library (PRD §17, LIB-01..05).
 *
 * The part of §17 that carries real weight is the last line: "Only show
 * formats supported by the destination." Templates and quick replies already
 * existed, but neither knew where it could be used, so an agent could pick a
 * voice note for a campaign — which Meta has no way to send. The failure then
 * surfaces as an API error long after the agent made the choice.
 *
 * The matrix below is Meta's constraints, not ours:
 *
 *   1:1 live    — inside the 24-hour service window: any supported media,
 *                 free-form text, interactive, commerce.
 *   1:1 template— outside the window: an APPROVED template only. Template
 *                 headers may be text, image, video or document. There is no
 *                 audio header, so a voice note can never be a template.
 *   Campaign    — the same template rule, at scale.
 *   Managed group — text, media and eligible templates. No interactive, no
 *                 commerce/product messages (§9.3), so a catalogue cannot go
 *                 to a group.
 *   External group — nothing is sent by us at all. A person copies the text
 *                 or downloads the file and posts it from their own phone, so
 *                 every format is "supported" and none of it is delivery we
 *                 can report on.
 *
 * Pure functions — no database, no network.
 */

export type ItemKind =
  | 'text' | 'image' | 'video' | 'audio' | 'document' | 'link' | 'catalogue' | 'template';

export type Destination =
  | 'one_to_one_live' | 'one_to_one_template' | 'campaign'
  | 'managed_group' | 'external_group_manual';

export const ITEM_KINDS: Array<{ value: ItemKind; label: string; hint?: string }> = [
  { value: 'text', label: 'Message' },
  { value: 'image', label: 'Image / creative' },
  { value: 'video', label: 'Video / reel' },
  { value: 'audio', label: 'Voice note', hint: 'Cannot be sent as a template or campaign' },
  { value: 'document', label: 'PDF / document' },
  { value: 'link', label: 'Link' },
  { value: 'catalogue', label: 'Catalogue / products', hint: 'Not available in groups' },
  { value: 'template', label: 'Approved template' },
];

export const DESTINATIONS: Array<{ value: Destination; label: string }> = [
  { value: 'one_to_one_live', label: '1:1 live chat' },
  { value: 'one_to_one_template', label: '1:1 template' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'managed_group', label: 'Managed group' },
  { value: 'external_group_manual', label: 'External group (manual)' },
];

export const AUDIENCES = [
  { value: 'new_lead', label: 'New leads' },
  { value: 'low_interest', label: 'Low or no interest' },
  { value: 'journey', label: 'Through the journey' },
  { value: 'relationship', label: 'Relationship / emotional' },
  { value: 'general', label: 'General' },
] as const;

export interface Usability {
  ok: boolean;
  /** Why not, in words an agent can act on. Never an API error code. */
  reason?: string;
  /** True when we do not send it — the agent copies it and posts it. */
  manual?: boolean;
}

export interface LibraryItemShape {
  kind: string;
  templateId?: string | null;
  fileId?: string | null;
  linkUrl?: string | null;
  body?: string | null;
  catalogueItemIds?: string[];
}

/**
 * Can this item be used at this destination?
 *
 * Returns a reason rather than a bare false, because the agent's next question
 * is always "why not" and the answer is usually actionable — turn it into a
 * template, or send it in the live window instead.
 */
export function canUse(item: LibraryItemShape, destination: Destination): Usability {
  const kind = item.kind as ItemKind;

  // Nothing is sent by us, so nothing is forbidden. It is also not delivery:
  // the agent posts it from their own phone and we never see it arrive.
  if (destination === 'external_group_manual') {
    return { ok: true, manual: true };
  }

  const templated = destination === 'one_to_one_template' || destination === 'campaign';
  const where = destination === 'campaign' ? 'a campaign' : 'a template message';

  if (templated) {
    // An approved template is the only thing Meta will deliver outside the
    // service window. An item that already points at one is fine whatever its
    // own kind, because the template is what gets sent.
    if (kind === 'template' || item.templateId) {
      return { ok: true };
    }
    if (kind === 'audio') {
      return {
        ok: false,
        reason: `WhatsApp templates cannot carry a voice note, so this cannot go in ${where}. Use it in a live chat instead.`,
      };
    }
    if (kind === 'catalogue') {
      return {
        ok: false,
        reason: `Product messages are not template content, so this cannot go in ${where}.`,
      };
    }
    return {
      ok: false,
      reason: `Outside the 24-hour window WhatsApp only delivers approved templates. Link this to a template to use it in ${where}.`,
    };
  }

  if (destination === 'managed_group') {
    // §9.3: no commerce or interactive messages inside groups.
    if (kind === 'catalogue') {
      return { ok: false, reason: 'WhatsApp does not allow product messages in groups.' };
    }
    return { ok: true };
  }

  // 1:1 live, inside the service window — everything we hold is sendable.
  return { ok: true };
}

/** The destinations an item can actually be used at. */
export function destinationsFor(item: LibraryItemShape): Destination[] {
  return DESTINATIONS.map((d) => d.value).filter((d) => canUse(item, d).ok);
}

/**
 * Narrow a library to what is usable at one destination.
 *
 * This is what the composer calls: an agent replying inside the window sees
 * voice notes, and the same agent sending a campaign does not — rather than
 * picking one and being refused afterwards.
 */
export function usableAt<T extends LibraryItemShape>(items: T[], destination: Destination): T[] {
  return items.filter((i) => canUse(i, destination).ok);
}

/**
 * Is an item complete enough to be used at all?
 *
 * A media item with no file and a link item with no URL are the two ways a
 * library entry ends up looking fine in a list and failing when picked.
 */
export function isComplete(item: LibraryItemShape): { ok: boolean; reason?: string } {
  const kind = item.kind as ItemKind;
  if (kind === 'text') {
    return item.body?.trim() ? { ok: true } : { ok: false, reason: 'Add the message text.' };
  }
  if (kind === 'link') {
    return item.linkUrl?.trim() ? { ok: true } : { ok: false, reason: 'Add the link.' };
  }
  if (kind === 'template') {
    return item.templateId ? { ok: true } : { ok: false, reason: 'Choose the approved template.' };
  }
  if (kind === 'catalogue') {
    return (item.catalogueItemIds?.length ?? 0) > 0
      ? { ok: true }
      : { ok: false, reason: 'Choose at least one product.' };
  }
  // image | video | audio | document
  return item.fileId ? { ok: true } : { ok: false, reason: 'Upload the file.' };
}

/**
 * Fill {{name}} and {{1}} placeholders.
 *
 * Shared with quick replies so an agent sees exactly what the customer will.
 * An unknown placeholder is left as-is rather than blanked: "Hi {{name}}"
 * going out as "Hi " is worse than it going out unfilled, because the second
 * is obviously a mistake and the first looks deliberate.
 */
export function fillPlaceholders(body: string, values: Record<string, string | undefined>): string {
  return body.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (whole, key: string) => {
    const v = values[key];
    return v != null && v !== '' ? v : whole;
  });
}

/** Placeholders an item needs, so the UI can say what it will ask for. */
export function placeholdersIn(body: string): string[] {
  const out = new Set<string>();
  for (const m of body.matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g)) out.add(m[1]);
  return [...out];
}
