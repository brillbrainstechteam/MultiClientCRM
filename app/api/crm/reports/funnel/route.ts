import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

/**
 * Sales funnel counts from real data: users called (distinct numbers in the
 * call log) -> enquiries received -> orders received. Quotations surfaced too.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const tenantId = user.tenantId;

  const [calledGroups, totalCalls, enquiries, quotations, orders] = await Promise.all([
    prisma.crmCallLog.groupBy({ by: ['mobile'], where: { tenantId } }),
    prisma.crmCallLog.count({ where: { tenantId } }),
    prisma.crmOrder.count({ where: { tenantId, OR: [{ type: 'enquiry' }, { status: 'enquiry' }] } }),
    prisma.crmOrder.count({ where: { tenantId, OR: [{ type: 'quotation' }, { status: 'quotation' }] } }),
    prisma.crmOrder.count({
      where: {
        tenantId,
        OR: [
          { type: 'order' },
          { status: { in: ['confirmed', 'payment_pending', 'part_paid', 'paid', 'processing', 'ready_dispatch', 'shipped', 'delivered'] } },
        ],
      },
    }),
  ]);

  return NextResponse.json({
    usersCalled: calledGroups.length,
    totalCalls,
    enquiries,
    quotations,
    orders,
  });
}
