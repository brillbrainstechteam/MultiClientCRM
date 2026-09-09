import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

/** List the tenant's selections (curated carts) with their items. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const selections = await prisma.crmSelection.findMany({
    where: { tenantId: user.tenantId }, orderBy: { updatedAt: 'desc' }, include: { items: true }, take: 200,
  });
  return NextResponse.json({ selections });
}

interface ItemIn { catalogueItemId?: string; title?: string; quantity?: number; note?: string }

/** Create a selection with items. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof b?.name === 'string' ? b.name.trim() : '';
  if (!name) return NextResponse.json({ error: 'Give the selection a name.' }, { status: 400 });

  const itemsIn: ItemIn[] = Array.isArray(b?.items) ? (b!.items as ItemIn[]) : [];
  const items = itemsIn.filter((i) => (i.title ?? '').trim() || i.catalogueItemId).map((i) => ({
    tenantId: user.tenantId,
    catalogueItemId: i.catalogueItemId ?? null,
    title: (i.title ?? '').trim() || 'Item',
    quantity: typeof i.quantity === 'number' && i.quantity > 0 ? i.quantity : 1,
    note: typeof i.note === 'string' ? i.note : null,
  }));

  const selection = await prisma.crmSelection.create({
    data: {
      tenantId: user.tenantId, name,
      contactId: typeof b?.contactId === 'string' ? b.contactId : null,
      note: typeof b?.note === 'string' ? b.note : null,
      createdByUserId: user.id,
      items: { create: items },
    },
    include: { items: true },
  });
  return NextResponse.json({ id: selection.id });
}
