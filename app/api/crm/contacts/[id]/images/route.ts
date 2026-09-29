import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';
import { putFile, storageStatus } from '@/lib/storage';

/**
 * Showroom photos for a contact (Customer 360 gallery). Bytes go to object
 * storage — local disk on our VPS or an S3-compatible bucket — and only the
 * pointer is stored in the database.
 */

// Base64 of ~8MB, matching the OCR upload ceiling.
const MAX_BASE64 = 11_000_000;
const ALLOWED = /^image\/(jpeg|png|webp|gif|heic|heif)$/;
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/gif': 'gif', 'image/heic': 'heic', 'image/heif': 'heif',
};

const shape = (f: { id: string; fileName: string; mimeType: string; size: number; caption: string | null; createdAt: Date }) => ({
  id: f.id,
  fileName: f.fileName,
  mimeType: f.mimeType,
  size: f.size,
  caption: f.caption,
  createdAt: f.createdAt.toISOString(),
  url: `/api/crm/files/${f.id}`,
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;

  const images = await prisma.crmFile.findMany({
    where: { tenantId: user.tenantId, contactId: id, kind: 'showroom' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, fileName: true, mimeType: true, size: true, caption: true, createdAt: true },
  });
  return NextResponse.json({ storage: storageStatus(), images: images.map(shape) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;

  const status = storageStatus();
  if (!status.ready) return NextResponse.json({ error: status.detail }, { status: 503 });

  const contact = await prisma.crmContact.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true, name: true } });
  if (!contact) return NextResponse.json({ error: 'Contact not found.' }, { status: 404 });

  const body = (await req.json().catch(() => null)) as
    | { fileBase64?: string; mimeType?: string; fileName?: string; caption?: string }
    | null;
  const base64 = typeof body?.fileBase64 === 'string' ? body.fileBase64 : '';
  const mimeType = typeof body?.mimeType === 'string' ? body.mimeType : '';
  if (!base64 || !mimeType) return NextResponse.json({ error: 'Missing file.' }, { status: 400 });
  if (base64.length > MAX_BASE64) return NextResponse.json({ error: 'Image too large — keep it under ~8MB.' }, { status: 400 });
  if (!ALLOWED.test(mimeType)) return NextResponse.json({ error: 'Upload a JPG, PNG, WEBP, GIF or HEIC image.' }, { status: 400 });

  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.length) return NextResponse.json({ error: 'That file appears to be empty.' }, { status: 400 });

  // Key is tenant-scoped so one bucket can hold every client's files safely.
  const fileId = crypto.randomUUID();
  const key = `tenants/${user.tenantId}/contacts/${id}/${fileId}.${EXT[mimeType] ?? 'bin'}`;

  let driver;
  try {
    driver = await putFile(key, bytes, mimeType);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not store the image.' }, { status: 502 });
  }

  const saved = await prisma.crmFile.create({
    data: {
      tenantId: user.tenantId,
      contactId: id,
      kind: 'showroom',
      driver,
      storageKey: key,
      fileName: (body?.fileName ?? 'photo').slice(0, 200),
      mimeType,
      size: bytes.length,
      caption: body?.caption?.slice(0, 300) || null,
      uploadedById: user.id,
    },
    select: { id: true, fileName: true, mimeType: true, size: true, caption: true, createdAt: true },
  });

  await audit({
    tenantId: user.tenantId,
    actorId: user.id,
    action: 'contact.image.upload',
    targetType: 'contact',
    targetId: id,
    detail: `${saved.fileName} (${Math.round(bytes.length / 1024)} KB) for ${contact.name}`,
  });

  return NextResponse.json({ ok: true, image: shape(saved) });
}
