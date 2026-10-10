import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

/**
 * Notification feed reader. Events are written by services via lib/billing/notify
 * (billing/wallet/campaign) and by the WhatsApp webhook ingest (template
 * rejections/pauses, re-categorisations, quality/limit changes, account
 * restrictions, coexistence). This is the read + mark-read half.
 *
 * GET   : recent events (newest first) + unread count.
 * PATCH : mark read — { ids: string[] } or { all: true }.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const category = sp.get('category');
  const where = { tenantId: user.tenantId, ...(category ? { category } : {}) };

  const [events, unreadCount] = await Promise.all([
    prisma.notificationEvent.findMany({ where, orderBy: { createdAt: 'desc' }, take: 30 }),
    prisma.notificationEvent.count({ where: { ...where, readAt: null } }),
  ]);

  return NextResponse.json({
    unreadCount,
    events: events.map((e) => ({
      id: e.id,
      category: e.category,
      kind: e.kind,
      severity: e.severity,
      title: e.title,
      body: e.body,
      read: Boolean(e.readAt),
      createdAt: e.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { ids?: string[]; all?: boolean };
  const where = body.all
    ? { tenantId: user.tenantId, readAt: null }
    : { tenantId: user.tenantId, id: { in: Array.isArray(body.ids) ? body.ids : [] } };

  const res = await prisma.notificationEvent.updateMany({ where, data: { readAt: new Date() } });
  return NextResponse.json({ updated: res.count });
}
