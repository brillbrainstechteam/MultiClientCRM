import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

const TYPES = ['field', 'telecalling', 'campaign', 'exhibition'];

/**
 * List planned activities. Scope by ?year=YYYY, or by a custom ?from=YYYY-MM-DD
 * &to=YYYY-MM-DD range (from/to takes precedence). Defaults to all.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const year = Number(sp.get('year'));
  const from = sp.get('from');
  const to = sp.get('to');
  const where: Record<string, unknown> = { tenantId: user.tenantId };
  if (from || to) {
    const range: Record<string, Date> = {};
    const f = from ? new Date(from) : null;
    const t = to ? new Date(to) : null;
    if (f && !isNaN(f.getTime())) range.gte = f;
    // Include the whole 'to' day.
    if (t && !isNaN(t.getTime())) { t.setHours(23, 59, 59, 999); range.lte = t; }
    if (Object.keys(range).length) where.date = range;
  } else if (year) {
    where.date = { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) };
  }
  const events = await prisma.crmPlanEvent.findMany({ where, orderBy: { date: 'asc' } });
  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id, title: e.title, type: e.type,
      date: e.date.toISOString(), endDate: e.endDate ? e.endDate.toISOString() : null, note: e.note,
      remindDaysBefore: e.remindDaysBefore, assigneeUserIds: e.assigneeUserIds, notifyWhatsapp: e.notifyWhatsapp,
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

  // Reminder config (optional).
  const remindRaw = b.remindDaysBefore;
  const remindDaysBefore = typeof remindRaw === 'number' && remindRaw >= 0 && remindRaw <= 365 ? Math.floor(remindRaw) : null;
  const assigneeUserIds = Array.isArray(b.assigneeUserIds) ? b.assigneeUserIds.map(String).filter(Boolean).slice(0, 50) : [];
  const notifyWhatsapp = b.notifyWhatsapp === true;

  const created = await prisma.crmPlanEvent.create({
    data: {
      tenantId: user.tenantId, title, type, date,
      endDate: endDate && !isNaN(endDate.getTime()) ? endDate : null,
      note: (typeof b.note === 'string' ? b.note.trim() : '') || null,
      createdByUserId: user.id,
      remindDaysBefore, assigneeUserIds, notifyWhatsapp,
    },
  });
  return NextResponse.json({ id: created.id, title: created.title, type: created.type, date: created.date.toISOString(), endDate: created.endDate?.toISOString() ?? null, note: created.note, remindDaysBefore: created.remindDaysBefore, assigneeUserIds: created.assigneeUserIds, notifyWhatsapp: created.notifyWhatsapp }, { status: 201 });
}

/** Edit a planned activity (owner/admin/manager). Accepts any subset of fields. */
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!['owner', 'admin', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Your role cannot edit plans.' }, { status: 403 });
  }
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = typeof b.id === 'string' ? b.id : '';
  if (!id) return NextResponse.json({ error: 'A plan id is required.' }, { status: 400 });

  const existing = await prisma.crmPlanEvent.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof b.title === 'string' && b.title.trim()) data.title = b.title.trim();
  if (TYPES.includes(String(b.type))) data.type = String(b.type);
  if (typeof b.date === 'string') { const d = new Date(b.date); if (!isNaN(d.getTime())) data.date = d; }
  if ('endDate' in b) { const e = typeof b.endDate === 'string' && b.endDate ? new Date(b.endDate) : null; data.endDate = e && !isNaN(e.getTime()) ? e : null; }
  if ('note' in b) data.note = (typeof b.note === 'string' ? b.note.trim() : '') || null;
  if ('remindDaysBefore' in b) data.remindDaysBefore = typeof b.remindDaysBefore === 'number' && b.remindDaysBefore >= 0 && b.remindDaysBefore <= 365 ? Math.floor(b.remindDaysBefore) : null;
  if (Array.isArray(b.assigneeUserIds)) data.assigneeUserIds = b.assigneeUserIds.map(String).filter(Boolean).slice(0, 50);
  if ('notifyWhatsapp' in b) data.notifyWhatsapp = b.notifyWhatsapp === true;

  // If timing or reminder config changed, let the reminder fire again.
  if ('date' in data || 'remindDaysBefore' in data || 'assigneeUserIds' in data) data.reminderSentAt = null;

  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });

  const updated = await prisma.crmPlanEvent.update({ where: { id }, data });
  return NextResponse.json({
    id: updated.id, title: updated.title, type: updated.type,
    date: updated.date.toISOString(), endDate: updated.endDate?.toISOString() ?? null, note: updated.note,
    remindDaysBefore: updated.remindDaysBefore, assigneeUserIds: updated.assigneeUserIds, notifyWhatsapp: updated.notifyWhatsapp,
  });
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
