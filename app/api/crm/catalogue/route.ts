import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

/** List the tenant's catalogue items (active first, newest first). */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const includeInactive = new URL(req.url).searchParams.get('all') === '1';

  const items = await prisma.crmCatalogueItem.findMany({
    where: { tenantId: user.tenantId, ...(includeInactive ? {} : { active: true }) },
    orderBy: { updatedAt: 'desc' },
    take: 500,
  });
  return NextResponse.json({ items });
}

/** Create a catalogue item. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!['owner', 'admin', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Your role cannot manage the catalogue.' }, { status: 403 });
  }
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const title = typeof b?.title === 'string' ? b.title.trim() : '';
  if (!title) return NextResponse.json({ error: 'Title is required.' }, { status: 400 });

  const str = (k: string) => (typeof b?.[k] === 'string' ? (b[k] as string) : null);
  const pricingMode = ['fixed', 'indicative', 'on_request'].includes(String(b?.pricingMode)) ? String(b?.pricingMode) : 'fixed';

  const item = await prisma.crmCatalogueItem.create({
    data: {
      tenantId: user.tenantId,
      title,
      sku: str('sku'),
      category: str('category'),
      subCategory: str('subCategory'),
      description: str('description'),
      images: Array.isArray(b?.images) ? (b.images as string[]) : [],
      videoUrl: str('videoUrl'),
      variants: (b?.variants ?? undefined) as never,
      size: str('size'), weight: str('weight'), material: str('material'), purity: str('purity'), colour: str('colour'),
      attributes: (b?.attributes ?? undefined) as never,
      grossWeight: str('grossWeight'), netWeight: str('netWeight'), stoneWeight: str('stoneWeight'),
      stoneDetails: str('stoneDetails'), karat: str('karat'),
      pricingMode,
      price: typeof b?.price === 'number' ? b.price : null,
      stockStatus: ['available', 'made_to_order'].includes(String(b?.stockStatus)) ? String(b?.stockStatus) : 'available',
      moq: typeof b?.moq === 'number' ? b.moq : null,
      tags: Array.isArray(b?.tags) ? (b.tags as string[]) : [],
      collection: str('collection'),
      active: b?.active !== false,
    },
  });
  return NextResponse.json({ id: item.id });
}
