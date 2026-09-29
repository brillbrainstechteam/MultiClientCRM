import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

const normMobile = (m: string) => {
  const t = String(m ?? '').trim();
  if (!t) return '';
  return t.startsWith('+') ? t : `+91${t.replace(/\D/g, '')}`;
};

/**
 * Build an activity plan: schedule a set of contacts for a calling/visit date
 * and (optionally) assign them to a team member. Contacts can be given by id
 * (picked from the list) and/or by mobile number (pasted / uploaded sheet).
 *
 * Body: { contactIds?: string[], mobiles?: string[], date: 'YYYY-MM-DD',
 *         assigneeUserId?: string }
 * Owner/admin/manager only (planning is a team-lead action).
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!['owner', 'admin', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Your role cannot build plans.' }, { status: 403 });
  }
  const tenantId = user.tenantId;

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const contactIds = Array.isArray(b?.contactIds) ? (b!.contactIds as unknown[]).map(String).filter(Boolean) : [];
  const mobilesRaw = Array.isArray(b?.mobiles) ? (b!.mobiles as unknown[]).map(String) : [];
  const date = typeof b?.date === 'string' ? new Date(b.date) : null;
  const assigneeUserId = typeof b?.assigneeUserId === 'string' && b.assigneeUserId ? b.assigneeUserId : null;
  if (!date || isNaN(date.getTime())) return NextResponse.json({ error: 'A valid date is required.' }, { status: 400 });

  // Resolve mobiles -> contact ids within this tenant.
  const ids = new Set(contactIds);
  let matched = 0; const unmatched: string[] = [];
  const mobiles = [...new Set(mobilesRaw.map(normMobile).filter(Boolean))];
  if (mobiles.length) {
    const found = await prisma.crmContact.findMany({
      where: { tenantId, OR: mobiles.flatMap((m) => [{ mobile: m }, { mobile: m.replace(/^\+91/, '') }]) },
      select: { id: true, mobile: true },
    });
    const foundSet = new Set(found.map((f) => normMobile(f.mobile)));
    for (const f of found) ids.add(f.id);
    matched = found.length;
    for (const m of mobiles) if (!foundSet.has(m)) unmatched.push(m);
  }

  if (ids.size === 0) return NextResponse.json({ error: 'No contacts selected or matched.', unmatched }, { status: 400 });

  // Validate the assignee is a real active member of this tenant.
  if (assigneeUserId) {
    const member = await prisma.user.findFirst({ where: { id: assigneeUserId, tenantId, status: 'active' }, select: { id: true } });
    if (!member) return NextResponse.json({ error: 'Assignee is not a valid team member.' }, { status: 400 });
  }

  const r = await prisma.crmContact.updateMany({
    where: { id: { in: [...ids] }, tenantId },
    data: {
      nextFollowUpAt: date,
      lastActivityAt: new Date(),
      ...(assigneeUserId ? { ownerId: assigneeUserId } : {}),
    },
  });

  return NextResponse.json({ ok: true, scheduled: r.count, matchedFromSheet: matched, unmatched });
}
