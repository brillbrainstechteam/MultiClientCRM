import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

const ORDER_STATUSES = [
  'draft', 'enquiry', 'quotation', 'confirmed', 'payment_pending', 'part_paid', 'paid',
  'processing', 'ready_dispatch', 'shipped', 'delivered', 'cancelled', 'returned',
];

/** List the tenant's orders (newest first) with line items. */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const status = new URL(req.url).searchParams.get('status') ?? undefined;

  const orders = await prisma.crmOrder.findMany({
    where: { tenantId: user.tenantId, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
    include: { items: true },
    take: 300,
  });
  return NextResponse.json({ orders });
}

interface ItemInput { catalogueItemId?: string; title?: string; quantity?: number; variant?: string; unitPrice?: number }

/** Create an order / enquiry / quotation with line items. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;

  const type = ['enquiry', 'quotation', 'order'].includes(String(b?.type)) ? String(b?.type) : 'order';
  const status = ORDER_STATUSES.includes(String(b?.status)) ? String(b?.status) : (type === 'order' ? 'confirmed' : type);
  const itemsIn: ItemInput[] = Array.isArray(b?.items) ? (b!.items as ItemInput[]) : [];

  const items = itemsIn
    .filter((i) => (i.title ?? '').trim() || i.catalogueItemId)
    .map((i) => {
      const qty = typeof i.quantity === 'number' && i.quantity > 0 ? i.quantity : 1;
      const unit = typeof i.unitPrice === 'number' ? i.unitPrice : null;
      return {
        tenantId: user.tenantId,
        catalogueItemId: i.catalogueItemId ?? null,
        title: (i.title ?? '').trim() || 'Item',
        quantity: qty,
        variant: i.variant ?? null,
        unitPrice: unit,
        lineTotal: unit != null ? unit * qty : null,
      };
    });

  const subtotal = items.reduce((s, i) => s + (i.lineTotal ?? 0), 0);
  const discount = typeof b?.discount === 'number' ? b.discount : null;
  const tax = typeof b?.tax === 'number' ? b.tax : null;
  const total = typeof b?.total === 'number' ? b.total : subtotal - (discount ?? 0) + (tax ?? 0);

  // Per-tenant sequential order number, with a collision fallback.
  const count = await prisma.crmOrder.count({ where: { tenantId: user.tenantId } });
  let orderNo = `ORD-${String(count + 1).padStart(4, '0')}`;
  if (await prisma.crmOrder.findFirst({ where: { tenantId: user.tenantId, orderNo }, select: { id: true } })) {
    orderNo = `ORD-${Date.now().toString(36).toUpperCase()}`;
  }

  const order = await prisma.crmOrder.create({
    data: {
      tenantId: user.tenantId,
      orderNo,
      type,
      status,
      contactId: typeof b?.contactId === 'string' ? b.contactId : null,
      company: typeof b?.company === 'string' ? b.company : null,
      contactPerson: typeof b?.contactPerson === 'string' ? b.contactPerson : null,
      discount, tax, total,
      paymentStatus: ['unpaid', 'part_paid', 'paid'].includes(String(b?.paymentStatus)) ? String(b?.paymentStatus) : 'unpaid',
      salesOwnerId: typeof b?.salesOwnerId === 'string' ? b.salesOwnerId : user.id,
      deliveryDetails: typeof b?.deliveryDetails === 'string' ? b.deliveryDetails : null,
      notes: typeof b?.notes === 'string' ? b.notes : null,
      expectedDeliveryAt: typeof b?.expectedDeliveryAt === 'string' && b.expectedDeliveryAt ? new Date(b.expectedDeliveryAt as string) : null,
      source: typeof b?.source === 'string' ? b.source : 'crm',
      items: { create: items },
    },
    include: { items: true },
  });
  return NextResponse.json({ id: order.id, orderNo: order.orderNo });
}
