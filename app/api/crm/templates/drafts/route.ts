import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

/**
 * Template drafts (doc §3.2 "Save for later"). Not-yet-submitted templates the
 * user can come back to. Stored as the full composer draft JSON — separate from
 * Meta-backed templates.
 *
 * GET            : list the tenant's drafts (newest first).
 * GET ?id=       : one draft with its full payload.
 * POST           : create or update ({ id?, name, payload }).
 * DELETE ?id=    : remove a draft.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (id) {
    const d = await prisma.crmTemplateDraft.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) return NextResponse.json({ error: 'Draft not found.' }, { status: 404 });
    return NextResponse.json({ id: d.id, name: d.name, payload: d.payload, updatedAt: d.updatedAt.toISOString() });
  }

  const drafts = await prisma.crmTemplateDraft.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { updatedAt: 'desc' },
    take: 200,
    select: { id: true, name: true, updatedAt: true, createdByUserId: true },
  });
  return NextResponse.json({ drafts: drafts.map((d) => ({ id: d.id, name: d.name, updatedAt: d.updatedAt.toISOString(), createdByUserId: d.createdByUserId })) });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!['owner', 'admin', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Your role cannot save template drafts.' }, { status: 403 });
  }

  const b = (await req.json().catch(() => ({}))) as { id?: string; name?: string; payload?: unknown };
  if (!b.payload || typeof b.payload !== 'object') return NextResponse.json({ error: 'Missing draft content.' }, { status: 400 });
  const name = (typeof b.name === 'string' ? b.name : '').trim() || 'Untitled template';
  const payload = b.payload as Prisma.InputJsonValue;

  if (b.id) {
    const existing = await prisma.crmTemplateDraft.findFirst({ where: { id: b.id, tenantId: user.tenantId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'Draft not found.' }, { status: 404 });
    const d = await prisma.crmTemplateDraft.update({ where: { id: b.id }, data: { name, payload } });
    return NextResponse.json({ id: d.id, updatedAt: d.updatedAt.toISOString() });
  }

  const d = await prisma.crmTemplateDraft.create({
    data: { tenantId: user.tenantId, createdByUserId: user.id, name, payload },
  });
  return NextResponse.json({ id: d.id, updatedAt: d.updatedAt.toISOString() }, { status: 201 });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id') ?? '';
  const r = await prisma.crmTemplateDraft.deleteMany({ where: { id, tenantId: user.tenantId } });
  if (r.count === 0) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
