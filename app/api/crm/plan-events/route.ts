import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { normaliseOffsets, DAY_MINUTES } from '@/lib/crm/reminders';

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
      allDay: e.allDay, remindOffsets: e.remindOffsets, remindersSent: e.remindersSent,
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

  // Reminder config (optional). A client may send either the new list of lead
  // times or the old single remindDaysBefore; the old form is translated so an
  // older build keeps working rather than silently losing its reminder.
  const remindRaw = b.remindDaysBefore;
  const remindDaysBefore = typeof remindRaw === 'number' && remindRaw >= 0 && remindRaw <= 365 ? Math.floor(remindRaw) : null;
  const remindOffsets = 'remindOffsets' in b
    ? normaliseOffsets(b.remindOffsets)
    : remindDaysBefore != null ? [remindDaysBefore * DAY_MINUTES] : [];
  // An event with no time of day cannot honour a minutes-before reminder, so
  // allDay is derived from whether a time was actually given.
  const allDay = typeof b.allDay === 'boolean' ? b.allDay : !/T\d{2}:\d{2}/.test(String(b.date ?? ''));
  const assigneeUserIds = Array.isArray(b.assigneeUserIds) ? b.assigneeUserIds.map(String).filter(Boolean).slice(0, 50) : [];
  const notifyWhatsapp = b.notifyWhatsapp === true;

  const created = await prisma.crmPlanEvent.create({
    data: {
      tenantId: user.tenantId, title, type, date,
      endDate: endDate && !isNaN(endDate.getTime()) ? endDate : null,
      note: (typeof b.note === 'string' ? b.note.trim() : '') || null,
      createdByUserId: user.id,
      remindDaysBefore, remindOffsets, allDay, assigneeUserIds, notifyWhatsapp,
    },
  });
  return NextResponse.json({
    id: created.id, title: created.title, type: created.type,
    date: created.date.toISOString(), endDate: created.endDate?.toISOString() ?? null, note: created.note,
    allDay: created.allDay, remindOffsets: created.remindOffsets, remindersSent: created.remindersSent,
    remindDaysBefore: created.remindDaysBefore, assigneeUserIds: created.assigneeUserIds, notifyWhatsapp: created.notifyWhatsapp,
  }, { status: 201 });
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
  if ('remindDaysBefore' in b) {
    const days = typeof b.remindDaysBefore === 'number' && b.remindDaysBefore >= 0 && b.remindDaysBefore <= 365
      ? Math.floor(b.remindDaysBefore) : null;
    data.remindDaysBefore = days;
    // Only when the caller did not also send the new field, so an old client
    // cannot wipe a multi-reminder set it does not know about.
    if (!('remindOffsets' in b)) data.remindOffsets = days != null ? [days * DAY_MINUTES] : [];
  }
  if ('remindOffsets' in b) data.remindOffsets = normaliseOffsets(b.remindOffsets);
  if ('allDay' in b) data.allDay = b.allDay === true;
  if (Array.isArray(b.assigneeUserIds)) data.assigneeUserIds = b.assigneeUserIds.map(String).filter(Boolean).slice(0, 50);
  if ('notifyWhatsapp' in b) data.notifyWhatsapp = b.notifyWhatsapp === true;

  // Moving the event or changing who is reminded invalidates what has already
  // gone out: the two-day warning for last Tuesday is not the two-day warning
  // for next Friday. Clearing the delivered list lets them fire afresh.
  if ('date' in data || 'remindOffsets' in data || 'allDay' in data || 'assigneeUserIds' in data) {
    data.remindersSent = [];
    data.reminderSentAt = null;
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });

  const updated = await prisma.crmPlanEvent.update({ where: { id }, data });
  return NextResponse.json({
    id: updated.id, title: updated.title, type: updated.type,
    date: updated.date.toISOString(), endDate: updated.endDate?.toISOString() ?? null, note: updated.note,
    allDay: updated.allDay, remindOffsets: updated.remindOffsets, remindersSent: updated.remindersSent,
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
