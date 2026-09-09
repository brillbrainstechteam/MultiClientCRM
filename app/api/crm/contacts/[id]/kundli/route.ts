import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { generateKundli } from '@/lib/crm/kundli';
import { audit } from '@/lib/crm/audit';

/** Return the cached kundli (pre-call dossier) for a contact, if any. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;
  const c = await prisma.crmContact.findFirst({
    where: { id, tenantId: user.tenantId },
    select: { kundli: true, kundliGeneratedAt: true },
  });
  if (!c) return NextResponse.json({ error: 'Contact not found.' }, { status: 404 });
  return NextResponse.json({ kundli: c.kundli ?? null, generatedAt: c.kundliGeneratedAt ? c.kundliGeneratedAt.toISOString() : null });
}

/** Generate (or refresh) the kundli for a contact and cache it. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;

  const c = await prisma.crmContact.findFirst({
    where: { id, tenantId: user.tenantId },
    select: {
      name: true, company: true, contactPerson: true, city: true, state: true, mobile: true,
      customerType: true, lifecycleStage: true, productInterests: true, tags: true,
    },
  });
  if (!c) return NextResponse.json({ error: 'Contact not found.' }, { status: 404 });

  try {
    const kundli = await generateKundli({
      company: c.company, contactPerson: c.contactPerson, name: c.name, city: c.city, state: c.state,
      mobile: c.mobile, customerType: c.customerType,
      relationship: c.lifecycleStage === 'customer' ? 'customer' : 'prospect',
      productInterests: c.productInterests, tags: c.tags,
    });
    const generatedAt = new Date();
    await prisma.crmContact.update({ where: { id }, data: { kundli: kundli as never, kundliGeneratedAt: generatedAt } });
    await audit({ tenantId: user.tenantId, actorId: user.id, action: 'kundli.generated', targetType: 'contact', targetId: id, detail: c.company ?? c.name });
    return NextResponse.json({ kundli, generatedAt: generatedAt.toISOString() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not generate the dossier.' }, { status: 502 });
  }
}
