import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { serializeEnquiry } from '../route';

const EDITABLE = new Set([
  'contactId', 'source', 'isNew', 'product', 'design', 'weightRange', 'sizeLength',
  'pcs', 'tentativeWeight', 'description', 'status', 'remarks', 'ownerId', 'imagesSentAt',
]);

/** Update an enquiry (status funnel: pending → images_sent → converted | lost | cancelled). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });

  const existing = await prisma.crmEnquiry.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!existing) return NextResponse.json({ error: 'Enquiry not found.' }, { status: 404 });

  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!EDITABLE.has(k)) continue;
    if (k === 'pcs') { data[k] = v === null || v === '' ? null : Math.trunc(Number(v)) || null; }
    else if (k === 'isNew') { data[k] = Boolean(v); }
    else if (k === 'imagesSentAt') { const d = v ? new Date(String(v)) : null; data[k] = d && !isNaN(d.getTime()) ? d : null; }
    else { data[k] = v; }
  }
  // Setting status to images_sent stamps the checkpoint if not already set.
  if (data.status === 'images_sent' && !existing.imagesSentAt && data.imagesSentAt === undefined) {
    data.imagesSentAt = new Date();
  }

  const updated = await prisma.crmEnquiry.update({ where: { id }, data });
  return NextResponse.json(serializeEnquiry(updated));
}

/** Delete an enquiry. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;
  const res = await prisma.crmEnquiry.deleteMany({ where: { id, tenantId: user.tenantId } });
  if (res.count === 0) return NextResponse.json({ error: 'Enquiry not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
