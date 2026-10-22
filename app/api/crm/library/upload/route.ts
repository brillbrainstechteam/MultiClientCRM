import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { checkStorage } from '@/lib/billing/limits';
import { audit } from '@/lib/crm/audit';
import { putFile, storageStatus } from '@/lib/storage';

/**
 * Upload a file for the Communication Library (PRD §17).
 *
 * Workspace-level rather than contact-scoped: every other upload route in the
 * product hangs off a contact, but library content belongs to the business —
 * one voice note is sent to a hundred customers.
 *
 * The allowed types are WhatsApp's, not ours. Letting somebody upload a .docx
 * here would produce a library item that looks fine and cannot be delivered,
 * which is exactly what the rest of §17 is built to avoid.
 */

const MAX_BASE64 = 22_000_000; // ~16MB, WhatsApp's video ceiling

/** What WhatsApp will actually carry, by the library kind it belongs to. */
const ALLOWED: Record<string, RegExp> = {
  image: /^image\/(jpeg|png|webp)$/,
  video: /^video\/(mp4|3gpp)$/,
  audio: /^audio\/(aac|mp4|mpeg|amr|ogg|opus)$/,
  document: /^application\/(pdf|msword|vnd\.openxmlformats-officedocument\.[a-z.]+|vnd\.ms-excel|vnd\.ms-powerpoint)$/,
};

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'video/mp4': 'mp4', 'video/3gpp': '3gp',
  'audio/aac': 'aac', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3',
  'audio/amr': 'amr', 'audio/ogg': 'ogg', 'audio/opus': 'opus',
  'application/pdf': 'pdf',
};

const FRIENDLY: Record<string, string> = {
  image: 'a JPG, PNG or WEBP image',
  video: 'an MP4 or 3GP video',
  audio: 'an AAC, M4A, MP3, AMR or OGG audio file',
  document: 'a PDF or Office document',
};

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const status = storageStatus();
  if (!status.ready) return NextResponse.json({ error: status.detail }, { status: 503 });

  const body = (await req.json().catch(() => null)) as
    | { fileBase64?: string; mimeType?: string; fileName?: string; kind?: string }
    | null;

  const base64 = typeof body?.fileBase64 === 'string' ? body.fileBase64 : '';
  const mimeType = typeof body?.mimeType === 'string' ? body.mimeType : '';
  const kind = String(body?.kind ?? '');

  if (!base64 || !mimeType) return NextResponse.json({ error: 'Missing file.' }, { status: 400 });
  if (!ALLOWED[kind]) return NextResponse.json({ error: 'That kind of content does not take a file.' }, { status: 400 });

  const incomingBytes = Math.floor((base64.length * 3) / 4);
  const room = await checkStorage(user.tenantId, incomingBytes);
  if (!room.allowed) return NextResponse.json({ error: room.reason, code: 'plan_limit' }, { status: 402 });
  if (base64.length > MAX_BASE64) {
    return NextResponse.json({ error: 'That file is too large — keep it under about 16MB.' }, { status: 400 });
  }

  if (!ALLOWED[kind].test(mimeType)) {
    return NextResponse.json(
      { error: `WhatsApp will not send that file type. Upload ${FRIENDLY[kind]}.` },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.length) return NextResponse.json({ error: 'That file appears to be empty.' }, { status: 400 });

  const fileId = crypto.randomUUID();
  const key = `tenants/${user.tenantId}/library/${fileId}.${EXT[mimeType] ?? 'bin'}`;

  let driver;
  try {
    driver = await putFile(key, bytes, mimeType);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not store the file.' }, { status: 502 });
  }

  const saved = await prisma.crmFile.create({
    data: {
      tenantId: user.tenantId,
      contactId: null,
      kind: 'library',
      driver,
      storageKey: key,
      fileName: (body?.fileName ?? 'file').slice(0, 200),
      mimeType,
      size: bytes.length,
      uploadedById: user.id,
    },
    select: { id: true, fileName: true, mimeType: true, size: true },
  });

  await audit({
    tenantId: user.tenantId, actorId: user.id, action: 'crm.library.file_uploaded',
    targetType: 'library_item', targetId: saved.id,
    detail: `${saved.fileName} (${Math.round(bytes.length / 1024)} KB)`,
  });

  return NextResponse.json({
    id: saved.id,
    fileName: saved.fileName,
    mimeType: saved.mimeType,
    size: saved.size,
    url: `/api/crm/files/${saved.id}`,
  }, { status: 201 });
}
