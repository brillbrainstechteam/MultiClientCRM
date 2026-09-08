import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

const EDITABLE = new Set([
  'name', 'company', 'mobile', 'email', 'city', 'ownerId', 'stage',
  'tags', 'source', 'consent', 'salesTier', 'branchId', 'primaryWhatsAppNumberId',
]);

/** Update editable fields on a tenant's contact. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });

  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!EDITABLE.has(k)) continue;
    if (k === 'tags') data[k] = Array.isArray(v) ? v.map(String) : [];
    else data[k] = v;
  }
  data.lastActivityAt = new Date();

  // Scope the write to the tenant (updateMany avoids leaking cross-tenant ids).
  const res = await prisma.crmContact.updateMany({ where: { id, tenantId: user.tenantId }, data });
  if (res.count === 0) return NextResponse.json({ error: 'Contact not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

/** Delete a tenant's contact. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;

  const res = await prisma.crmContact.deleteMany({ where: { id, tenantId: user.tenantId } });
  if (res.count === 0) return NextResponse.json({ error: 'Contact not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
