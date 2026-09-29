import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

const TYPES = ['field', 'telecalling', 'campaign', 'exhibition'];

/** List planned activities, optionally within ?year=YYYY (defaults to all). */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const year = Number(new URL(req.url).searchParams.get('year'));
  const where: Record<string, unknown> = { tenantId: user.tenantId };
  if (year) where.date = { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) };
  const events = await prisma.crmPlanEvent.findMany({ where, orderBy: { date: 'asc' } });
  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id, title: e.title, type: e.type,
      date: e.date.toISOString(), endDate: e.endDate ? e.endDate.toISOString() : null, note: e.note,
    })),
  });
}

/** Create a planned activity (owner/admin/manager). */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!['owner', 'admin', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Your role cannot add plans.' }, { status: 403 });
  }
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = (typeof b.title === 'string' ? b.title : '').trim();
  const type = TYPES.includes(String(b.type)) ? String(b.type) : 'campaign';
  const date = typeof b.date === 'string' ? new Date(b.date) : null;
  const endDate = typeof b.endDate === 'string' && b.endDate ? new Date(b.endDate) : null;
  if (!title) return NextResponse.json({ error: 'A title is required.' }, { status: 400 });
  if (!date || isNaN(date.getTime())) return NextResponse.json({ error: 'A valid date is required.' }, { status: 400 });

  const created = await prisma.crmPlanEvent.create({
    data: { tenantId: user.tenantId, title, type, date, endDate: endDate && !isNaN(endDate.getTime()) ? endDate : null, note: (typeof b.note === 'string' ? b.note.trim() : '') || null, createdByUserId: user.id },
  });
  return NextResponse.json({ id: created.id, title: created.title, type: created.type, date: created.date.toISOString(), endDate: created.endDate?.toISOString() ?? null, note: created.note }, { status: 201 });
}

/** Delete a planned activity (owner/admin/manager). */
export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!['owner', 'admin', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Your role cannot remove plans.' }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get('id') ?? '';
  const r = await prisma.crmPlanEvent.deleteMany({ where: { id, tenantId: user.tenantId } });
  if (r.count === 0) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
