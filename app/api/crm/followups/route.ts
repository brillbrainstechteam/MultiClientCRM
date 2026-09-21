import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

/**
 * Follow-up queue (jewellery telecalling "Daily Planning"): contacts with a
 * nextFollowUpAt, bucketed into overdue / today / upcoming so a rep can see
 * "who to follow up" at a glance.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const now = new Date();
  const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999);
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const in7 = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

  const rows = await prisma.crmContact.findMany({
    where: { tenantId: user.tenantId, nextFollowUpAt: { not: null, lt: in7 } },
    orderBy: { nextFollowUpAt: 'asc' },
    take: 100,
    select: {
      id: true, name: true, company: true, mobile: true, nextFollowUpAt: true,
      interestedIn: true, ownerId: true, kamUserId: true, businessSegment: true, grade: true,
    },
  });

  const map = (c: (typeof rows)[number]) => ({
    id: c.id, name: c.name, company: c.company, mobile: c.mobile,
    nextFollowUpAt: c.nextFollowUpAt ? c.nextFollowUpAt.toISOString() : null,
    interestedIn: c.interestedIn, ownerId: c.ownerId, kamUserId: c.kamUserId,
    businessSegment: c.businessSegment, grade: c.grade,
  });

  const overdue = rows.filter((c) => c.nextFollowUpAt! < startOfToday).map(map);
  const today = rows.filter((c) => c.nextFollowUpAt! >= startOfToday && c.nextFollowUpAt! <= endOfToday).map(map);
  const upcoming = rows.filter((c) => c.nextFollowUpAt! > endOfToday).map(map);

  return NextResponse.json({ overdue, today, upcoming, counts: { overdue: overdue.length, today: today.length, upcoming: upcoming.length } });
}
