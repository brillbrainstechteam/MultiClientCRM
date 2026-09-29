import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';
import { getFile, removeFile, type DriverName } from '@/lib/storage';

/**
 * Serve and delete a stored file. Bytes are streamed through this route rather
 * than from a public bucket URL, so a file is only ever readable by someone
 * signed into the workspace that owns it.
 */

export async function GET(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { fileId } = await params;

  const file = await prisma.crmFile.findFirst({ where: { id: fileId, tenantId: user.tenantId } });
  if (!file) return NextResponse.json({ error: 'File not found.' }, { status: 404 });

  const bytes = await getFile(file.storageKey, file.driver as DriverName);
  if (!bytes) return NextResponse.json({ error: 'The stored file is missing.' }, { status: 404 });

  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': file.mimeType,
      'Content-Length': String(bytes.length),
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': `inline; filename="${encodeURIComponent(file.fileName)}"`,
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { fileId } = await params;

  const file = await prisma.crmFile.findFirst({ where: { id: fileId, tenantId: user.tenantId } });
  if (!file) return NextResponse.json({ error: 'File not found.' }, { status: 404 });

  await removeFile(file.storageKey, file.driver as DriverName);
  await prisma.crmFile.delete({ where: { id: file.id } });
  await audit({
    tenantId: user.tenantId,
    actorId: user.id,
    action: 'contact.image.delete',
    targetType: 'contact',
    targetId: file.contactId,
    detail: file.fileName,
  });
  return NextResponse.json({ ok: true });
}
