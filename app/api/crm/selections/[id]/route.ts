import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';

const STATUSES = ['draft', 'shared', 'confirmed', 'converted', 'closed'];

/**
 * Update a selection's status/note, or convert it to an order.
 * Body: { status?, note?, convert?: true }
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;
  const selection = await prisma.crmSelection.findFirst({ where: { id, tenantId: user.tenantId }, include: { items: true } });
  if (!selection) return NextResponse.json({ error: 'Selection not found.' }, { status: 404 });

  const b = (await req.json().catch(() => ({}))) as { status?: string; note?: string; convert?: boolean };

  // Convert to an order (creates a real CrmOrder from the selection's items).
  if (b.convert) {
    const count = await prisma.crmOrder.count({ where: { tenantId: user.tenantId } });
    const orderNo = `ORD-${String(count + 1).padStart(4, '0')}`;
    const order = await prisma.crmOrder.create({
      data: {
        tenantId: user.tenantId, orderNo, type: 'order', status: 'confirmed',
        contactId: selection.contactId, source: 'crm', salesOwnerId: user.id,
        items: { create: selection.items.map((i) => ({ tenantId: user.tenantId, catalogueItemId: i.catalogueItemId, title: i.title, quantity: i.quantity })) },
      },
    });
    await prisma.crmSelection.update({ where: { id }, data: { status: 'converted' } });
    await audit({ tenantId: user.tenantId, actorId: user.id, action: 'order.status', targetType: 'order', targetId: order.id, detail: `${orderNo} from selection "${selection.name}"` });
    return NextResponse.json({ orderId: order.id, orderNo });
  }

  const data: Record<string, unknown> = {};
  if (typeof b.status === 'string' && STATUSES.includes(b.status)) data.status = b.status;
  if (typeof b.note === 'string') data.note = b.note;
  await prisma.crmSelection.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
