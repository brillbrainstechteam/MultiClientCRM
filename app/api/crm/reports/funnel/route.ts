import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { visibleUserIds } from '@/lib/crm/scope';

/**
 * Marketing funnel + geographic conversion (Prospects/Enquiry Tracker dashboards).
 *   Reach       = contacts added (data)
 *   Enquiries   = enquiries created
 *   Activations = contacts activated (prospect -> customer)
 * Plus a Data-vs-Activated breakdown by zone / state / city. Row-level scoped.
 * Optional ?from=YYYY-MM-DD&to=YYYY-MM-DD windows all three by their own date.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const tenantId = user.tenantId;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : null;
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : null;
  const range = (from || to) ? { ...(from && !isNaN(from.getTime()) ? { gte: from } : {}), ...(to && !isNaN(to.getTime()) ? { lte: to } : {}) } : undefined;

  const vis = await visibleUserIds(user);
  const ownerIn = vis === 'all' ? {} : { ownerId: { in: vis } };
  const base = { tenantId, ...ownerIn };

  const [reach, enquiries, activations, dataByZone, actByZone, dataByState, actByState, dataByCity, actByCity] = await Promise.all([
    prisma.crmContact.count({ where: { ...base, ...(range ? { createdAt: range } : {}) } }),
    prisma.crmEnquiry.count({ where: { tenantId, ...(range ? { createdAt: range } : {}) } }),
    prisma.crmContact.count({ where: { ...base, lifecycleStage: 'customer', ...(range ? { activatedAt: range } : { activatedAt: { not: null } }) } }),
    prisma.crmContact.groupBy({ by: ['zone'], where: base, _count: true }),
    prisma.crmContact.groupBy({ by: ['zone'], where: { ...base, lifecycleStage: 'customer' }, _count: true }),
    prisma.crmContact.groupBy({ by: ['state'], where: base, _count: true }),
    prisma.crmContact.groupBy({ by: ['state'], where: { ...base, lifecycleStage: 'customer' }, _count: true }),
    prisma.crmContact.groupBy({ by: ['city'], where: base, _count: true }),
    prisma.crmContact.groupBy({ by: ['city'], where: { ...base, lifecycleStage: 'customer' }, _count: true }),
  ]);

  const merge = (dataRows: { _count: number }[] & { [k: string]: unknown }[], actRows: { _count: number }[] & { [k: string]: unknown }[], key: string) => {
    const act = new Map<string, number>();
    for (const r of actRows as Record<string, unknown>[]) act.set(String(r[key] ?? '—'), (r._count as number) ?? 0);
    return (dataRows as Record<string, unknown>[])
      .map((r) => {
        const label = String(r[key] ?? '') || '—';
        const data = (r._count as number) ?? 0;
        const activated = act.get(String(r[key] ?? '—')) ?? 0;
        return { label, data, activated, pct: data ? Math.round((activated / data) * 100) : 0 };
      })
      .filter((r) => r.label && r.label !== '—')
      .sort((a, b) => b.data - a.data);
  };

  return NextResponse.json({
    scope: vis === 'all' ? 'all' : 'scoped',
    funnel: {
      reach,
      enquiries,
      activations,
      enquiryRate: reach ? Math.round((enquiries / reach) * 100) : 0,
      closureRate: enquiries ? Math.round((activations / enquiries) * 100) : 0,
    },
    byZone: merge(dataByZone as never, actByZone as never, 'zone'),
    byState: merge(dataByState as never, actByState as never, 'state'),
    byCity: merge(dataByCity as never, actByCity as never, 'city').slice(0, 15),
  });
}
