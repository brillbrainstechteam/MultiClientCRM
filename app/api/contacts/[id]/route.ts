import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

async function owned(id: string, tenantId: string) {
  const c = await prisma.contact.findUnique({ where: { id } });
  return c && c.tenantId === tenantId ? c : null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await ctx.params;
  const contact = await owned(id, user.tenantId);
  if (!contact) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const [users, messageCount] = await Promise.all([
    prisma.user.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true, role: true } }),
    prisma.message.count({ where: { conversation: { tenantId: user.tenantId, contactPhone: contact.phone } } }),
  ]);
  return NextResponse.json({ contact, users, messageCount });
}

const s = z.string().optional().nullable();
const patchSchema = z.object({
  type: z.enum(['b2b', 'b2c']).optional(),
  name: s, businessName: s, contactPerson: s, legalName: s, gstin: s,
  email: s, company: s,
  country: s, state: s, zone: s, area: s, pincode: s, city: s, branch: s,
  billingAddress: s, shippingAddress: s,
  source: s, customerType: s, businessValue: s,
  productInterests: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  notes: s,
  salesOwnerId: s, marketingOwnerId: s,
  consentOptIn: z.boolean().optional(), consentSource: s,
  optedOut: z.boolean().optional(), blocked: z.boolean().optional(),
  customFields: z.record(z.string(), z.any()).optional(),
});

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await ctx.params;
  const contact = await owned(id, user.tenantId);
  if (!contact) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid data.' }, { status: 400 });
  const d = parsed.data;

  const data: Record<string, unknown> = { ...d, lastActivityAt: new Date() };
  if (d.consentOptIn && !contact.consentOptIn) data.consentAt = new Date();
  // keep display name sensible for B2B
  if (d.type === 'b2b' || contact.type === 'b2b') {
    const bn = d.businessName ?? contact.businessName;
    if (bn) data.name = bn;
  }

  const updated = await prisma.contact.update({ where: { id }, data });

  // log an ownership change
  if (d.salesOwnerId !== undefined && d.salesOwnerId !== contact.salesOwnerId) {
    const to = d.salesOwnerId ? (await prisma.user.findUnique({ where: { id: d.salesOwnerId }, select: { name: true } }))?.name : null;
    await prisma.contactActivity.create({
      data: { contactId: id, tenantId: user.tenantId, kind: 'ownership', title: to ? `Assigned to ${to}` : 'Owner cleared', byUserId: user.id },
    });
  }

  return NextResponse.json({ contact: updated });
}
