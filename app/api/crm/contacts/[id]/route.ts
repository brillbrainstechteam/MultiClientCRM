import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

const EDITABLE = new Set([
  'name', 'company', 'contactPerson', 'customerType', 'mobile', 'email', 'city',
  'ownerId', 'stage', 'leadStatus', 'lifecycleStage', 'lifecycleState',
  'tags', 'productInterests', 'source', 'consent', 'consentOptInSource', 'salesTier',
  'businessValue', 'gstin', 'legalName', 'billingAddress', 'shippingAddress',
  'state', 'zone', 'pincode', 'primaryWhatsAppNumberId', 'branchId',
]);
const ARRAY_FIELDS = new Set(['tags', 'productInterests']);

/** Update editable fields on a tenant's contact, logging lead/lifecycle moves. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });

  const existing = await prisma.crmContact.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!existing) return NextResponse.json({ error: 'Contact not found.' }, { status: 404 });

  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!EDITABLE.has(k)) continue;
    data[k] = ARRAY_FIELDS.has(k) ? (Array.isArray(v) ? v.map(String) : []) : v;
  }
  data.lastActivityAt = new Date();

  // Req 33/39: converting a prospect to customer stamps the activation date.
  if (data.lifecycleStage === 'customer' && existing.lifecycleStage !== 'customer' && !existing.activatedAt) {
    data.activatedAt = new Date();
  }

  const transitions: { kind: string; from: string | null; to: string }[] = [];
  if (typeof data.leadStatus === 'string' && data.leadStatus !== existing.leadStatus) {
    transitions.push({ kind: 'lead', from: existing.leadStatus, to: data.leadStatus });
  }
  if (typeof data.lifecycleStage === 'string' && data.lifecycleStage !== existing.lifecycleStage) {
    transitions.push({ kind: 'lifecycle', from: existing.lifecycleStage, to: data.lifecycleStage });
  }

  await prisma.$transaction([
    prisma.crmContact.update({ where: { id }, data }),
    ...transitions.map((t) =>
      prisma.crmStageTransition.create({
        data: { tenantId: user.tenantId, contactId: id, kind: t.kind, fromValue: t.from, toValue: t.to, byUserId: user.id },
      }),
    ),
  ]);
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
