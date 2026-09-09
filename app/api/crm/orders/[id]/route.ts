import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

const ORDER_STATUSES = [
  'draft', 'enquiry', 'quotation', 'confirmed', 'payment_pending', 'part_paid', 'paid',
  'processing', 'ready_dispatch', 'shipped', 'delivered', 'cancelled', 'returned',
];

/** Update an order's status / payment / logistics fields. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.crmOrder.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!existing) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (typeof b.status === 'string' && ORDER_STATUSES.includes(b.status)) data.status = b.status;
  if (typeof b.paymentStatus === 'string' && ['unpaid', 'part_paid', 'paid'].includes(b.paymentStatus)) data.paymentStatus = b.paymentStatus;
  if (typeof b.notes === 'string') data.notes = b.notes;
  if (typeof b.deliveryDetails === 'string') data.deliveryDetails = b.deliveryDetails;
  if (typeof b.expectedDeliveryAt === 'string') data.expectedDeliveryAt = b.expectedDeliveryAt ? new Date(b.expectedDeliveryAt) : null;
  if (typeof b.total === 'number') data.total = b.total;

  await prisma.crmOrder.update({ where: { id }, data: data as never });
  return NextResponse.json({ ok: true });
}
