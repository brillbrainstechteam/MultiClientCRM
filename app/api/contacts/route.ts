import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { normalizePhone } from '@/lib/contacts/model';
import type { Prisma } from '@prisma/client';

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim();
  const type = url.searchParams.get('type');
  const leadStatus = url.searchParams.get('leadStatus');
  const lifecycle = url.searchParams.get('lifecycle');
  const owner = url.searchParams.get('owner');
  const source = url.searchParams.get('source');

  const where: Prisma.ContactWhereInput = { tenantId: user.tenantId };
  if (type) where.type = type;
  if (leadStatus) where.leadStatus = leadStatus;
  if (lifecycle) where.lifecycleStage = lifecycle;
  if (source) where.source = source;
  if (owner === 'unassigned') where.salesOwnerId = null;
  else if (owner) where.salesOwnerId = owner;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { businessName: { contains: q, mode: 'insensitive' } },
      { contactPerson: { contains: q, mode: 'insensitive' } },
      { phone: { contains: normalizePhone(q) || q } },
      { email: { contains: q, mode: 'insensitive' } },
      { company: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [contacts, total, prospects, customers, unassigned] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: [{ lastActivityAt: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    }),
    prisma.contact.count({ where: { tenantId: user.tenantId } }),
    prisma.contact.count({ where: { tenantId: user.tenantId, lifecycleStage: 'prospect' } }),
    prisma.contact.count({ where: { tenantId: user.tenantId, lifecycleStage: 'customer' } }),
    prisma.contact.count({ where: { tenantId: user.tenantId, salesOwnerId: null } }),
  ]);

  // owner names for display
  const ownerIds = [...new Set(contacts.map((c) => c.salesOwnerId).filter(Boolean) as string[])];
  const owners = ownerIds.length
    ? await prisma.user.findMany({ where: { id: { in: ownerIds } }, select: { id: true, name: true } })
    : [];
  const ownerMap = Object.fromEntries(owners.map((o) => [o.id, o.name]));

  return NextResponse.json({
    contacts: contacts.map((c) => ({ ...c, salesOwnerName: c.salesOwnerId ? ownerMap[c.salesOwnerId] ?? null : null })),
    stats: { total, prospects, customers, unassigned },
  });
}

const createSchema = z.object({
  type: z.enum(['b2b', 'b2c']).default('b2c'),
  name: z.string().optional(),
  businessName: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().min(6),
  email: z.string().email().optional().or(z.literal('')),
  city: z.string().optional(),
  source: z.string().optional(),
  leadStatus: z.string().optional(),
  gstin: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid data.' }, { status: 400 });
  const d = parsed.data;
  const phone = normalizePhone(d.phone);
  if (!phone) return NextResponse.json({ error: 'A valid phone number is required.' }, { status: 400 });

  // Dedup: match against the contact master before creating.
  const existing = await prisma.contact.findUnique({ where: { tenantId_phone: { tenantId: user.tenantId, phone } } });
  if (existing) {
    return NextResponse.json(
      { error: 'A contact with this phone number already exists.', duplicateId: existing.id },
      { status: 409 },
    );
  }

  const displayName = d.type === 'b2b' ? d.businessName || d.contactPerson || null : d.name || null;
  const contact = await prisma.contact.create({
    data: {
      tenantId: user.tenantId,
      phone,
      type: d.type,
      name: displayName,
      businessName: d.businessName || null,
      contactPerson: d.contactPerson || null,
      email: d.email || null,
      city: d.city || null,
      source: d.source || null,
      gstin: d.gstin || null,
      tags: d.tags ?? [],
      leadStatus: d.leadStatus || 'new',
      importSource: 'manual',
      firstInteractionAt: new Date(),
      lastActivityAt: new Date(),
    },
  });

  await prisma.contactActivity.create({
    data: { contactId: contact.id, tenantId: user.tenantId, kind: 'system', title: 'Contact created', detail: `Added manually as a ${d.type.toUpperCase()} contact.`, byUserId: user.id },
  });

  return NextResponse.json({ contact }, { status: 201 });
}
