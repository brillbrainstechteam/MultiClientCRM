import { prisma } from '@/lib/db';
import { graphBase } from '@/lib/meta/config';
import { putFile } from '@/lib/storage';
import { checkStorage } from '@/lib/billing/limits';

/**
 * WhatsApp media: getting an inbound attachment onto our own disk, and getting
 * one of ours onto WhatsApp.
 *
 * Inbound is a two-step dance Meta requires: the webhook gives you only a media
 * **id**, you exchange that for a short-lived URL, and the download itself needs
 * the access token as a bearer header. A plain fetch of that URL returns 401.
 *
 * Timing matters: Meta keeps media for roughly **14 days**. After that the id is
 * dead and the attachment is unrecoverable, which is why the download happens
 * at ingest rather than lazily when somebody opens the thread. The message is
 * written first and the file attached after, so a download failure costs the
 * attachment but never the message.
 *
 * Outbound is the reverse: our files are not public, so a link will not do —
 * the bytes are uploaded to Meta, and the id that comes back is what gets sent.
 */

/** Media types Meta can deliver. */
export const MEDIA_TYPES = ['image', 'video', 'audio', 'document', 'sticker', 'voice'] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export function isMediaType(type: string | undefined | null): type is MediaType {
  return !!type && (MEDIA_TYPES as readonly string[]).includes(type);
}

/**
 * Hard ceiling on what we will store from one message.
 *
 * Meta's own send limits are smaller for most types (images 5MB, video and
 * audio 16MB) but documents reach 100MB, and a handful of those would eat a
 * Starter plan's entire storage allowance. The plan limit is checked as well —
 * this is just the per-file sanity bound.
 */
export const MAX_MEDIA_BYTES = 25 * 1024 * 1024;

interface MediaMeta { url: string; mimeType: string; fileSize: number; fileName?: string }

/** Exchange a media id for its short-lived download URL. */
async function resolveMediaUrl(mediaId: string, token: string): Promise<MediaMeta | null> {
  const res = await fetch(`${graphBase()}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const json = (await res.json().catch(() => ({}))) as {
    url?: string; mime_type?: string; file_size?: number;
  };
  if (!json.url) return null;
  return {
    url: json.url,
    mimeType: json.mime_type ?? 'application/octet-stream',
    fileSize: json.file_size ?? 0,
  };
}

/** Download the bytes. The URL is Meta's and still requires the bearer token. */
async function downloadMedia(url: string, token: string): Promise<Buffer | null> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.length ? buf : null;
}

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/3gpp': '3gp',
  'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/amr': 'amr',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

function extFor(mimeType: string): string {
  if (EXT[mimeType]) return EXT[mimeType];
  const guess = (mimeType.split('/')[1] ?? '').replace(/[^a-z0-9]/gi, '').slice(0, 5);
  return guess || 'bin';
}

export interface StoredMedia { fileId: string; fileName: string; mimeType: string; size: number }

/**
 * Fetch an inbound attachment and store it as a CrmFile.
 *
 * Returns null — never throws — when the media cannot be had: an expired id, a
 * file past the size ceiling, no storage left on the plan, or a network
 * failure. The caller keeps the message either way; losing a photo is bad,
 * losing the message that came with it is worse.
 */
export async function storeInboundMedia(input: {
  tenantId: string;
  mediaId: string;
  token: string;
  /** Meta's declared filename, for documents. */
  suggestedName?: string | null;
  contactId?: string | null;
}): Promise<StoredMedia | null> {
  const meta = await resolveMediaUrl(input.mediaId, input.token).catch(() => null);
  if (!meta) return null;

  if (meta.fileSize && meta.fileSize > MAX_MEDIA_BYTES) return null;

  // Storage is a plan limit; refuse before downloading rather than after.
  const room = await checkStorage(input.tenantId, meta.fileSize || 0).catch(() => null);
  if (room && !room.allowed) return null;

  const bytes = await downloadMedia(meta.url, input.token).catch(() => null);
  if (!bytes || bytes.length > MAX_MEDIA_BYTES) return null;

  const ext = extFor(meta.mimeType);
  const fileName = (input.suggestedName?.trim() || `whatsapp-${input.mediaId}.${ext}`).slice(0, 180);
  const key = `tenants/${input.tenantId}/whatsapp/${input.mediaId}.${ext}`;

  try {
    const driver = await putFile(key, bytes, meta.mimeType);
    const row = await prisma.crmFile.create({
      data: {
        tenantId: input.tenantId,
        contactId: input.contactId ?? null,
        kind: 'whatsapp',
        driver,
        storageKey: key,
        fileName,
        mimeType: meta.mimeType,
        size: bytes.length,
      },
      select: { id: true },
    });
    return { fileId: row.id, fileName, mimeType: meta.mimeType, size: bytes.length };
  } catch {
    return null;
  }
}

/**
 * Upload bytes to Meta for sending, returning the media id.
 *
 * Our files are not publicly reachable, so the `link` form of a media message
 * is not an option — the bytes have to go to Meta first.
 */
export async function uploadMediaForSend(input: {
  phoneNumberId: string;
  token: string;
  bytes: Buffer;
  mimeType: string;
  fileName: string;
}): Promise<{ ok: true; mediaId: string } | { ok: false; error: string }> {
  try {
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', input.mimeType);
    form.append(
      'file',
      new Blob([new Uint8Array(input.bytes)], { type: input.mimeType }),
      input.fileName,
    );

    const res = await fetch(`${graphBase()}/${input.phoneNumberId}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${input.token}` },
      body: form,
    });
    const json = (await res.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
    if (!res.ok || !json.id) {
      return { ok: false, error: json.error?.message ?? `Meta rejected the upload (${res.status}).` };
    }
    return { ok: true, mediaId: json.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not reach Meta.' };
  }
}

/** Which Cloud API message type carries a given mime type. */
export function sendTypeFor(mimeType: string): 'image' | 'video' | 'audio' | 'document' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

/** A readable stand-in when there is no caption — never an empty bubble. */
export function mediaPlaceholderText(type: string, fileName?: string | null): string {
  const noun = type === 'image' ? 'Photo'
    : type === 'video' ? 'Video'
    : type === 'audio' || type === 'voice' ? 'Voice message'
    : type === 'sticker' ? 'Sticker'
    : 'Document';
  return fileName ? `${noun}: ${fileName}` : noun;
}
