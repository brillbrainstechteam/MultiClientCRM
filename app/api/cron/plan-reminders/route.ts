import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { notify } from '@/lib/billing/notify';

export const dynamic = 'force-dynamic';

/**
 * Daily reminder job for planning-calendar activities. Run it once a day from
 * the VPS crontab:
 *
 *   curl -fsS -H "x-cron-secret: $CRON_SECRET" \
 *        https://talktrackcrm.brillbrainsconsultants.com/api/cron/plan-reminders
 *
 * For every plan event whose reminder is due (today >= date - remindDaysBefore)
 * and not yet sent, it drops an in-app notification to each assignee (or
 * tenant-wide if none are assigned) and marks the reminder sent so it never
 * fires twice. WhatsApp delivery is attempted only when enabled AND a staff
 * number is available (none are stored yet, so it is reported as skipped).
 */
const TYPE_LABEL: Record<string, string> = { field: 'Field marketing', telecalling: 'Calling', campaign: 'Marketing', exhibition: 'Exhibition' };
const DAY = 86_400_000;
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

async function run(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 500 });
  const sent = req.headers.get('x-cron-secret') ?? new URL(req.url).searchParams.get('secret');
  if (sent !== secret) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const now = new Date();
  const todayStart = startOfDay(now);

  // Candidates: have a reminder configured, not yet sent, event still upcoming
  // (within the next year). Dueness is computed per-event below.
  const candidates = await prisma.crmPlanEvent.findMany({
    where: {
      remindDaysBefore: { not: null },
      reminderSentAt: null,
      date: { gte: todayStart, lte: new Date(todayStart.getTime() + 366 * DAY) },
    },
  });

  let notified = 0, fired = 0, whatsappSkipped = 0;
  for (const e of candidates) {
    const remind = e.remindDaysBefore ?? 0;
    const reminderDay = new Date(startOfDay(e.date).getTime() - remind * DAY);
    if (todayStart < reminderDay) continue; // not due yet

    const daysOut = Math.round((startOfDay(e.date).getTime() - todayStart.getTime()) / DAY);
    const when = daysOut <= 0 ? 'today' : daysOut === 1 ? 'tomorrow' : `in ${daysOut} days`;
    const label = TYPE_LABEL[e.type] ?? 'Activity';
    const prettyDate = e.date.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
    const title = `Reminder: ${e.title}`;
    const body = `${label} ${when} (${prettyDate})${e.note ? ` — ${e.note}` : ''}`;

    const targets = e.assigneeUserIds.length ? e.assigneeUserIds : [null]; // null = tenant-wide
    for (const userId of targets) {
      await notify({
        tenantId: e.tenantId, userId, category: 'campaign', kind: 'plan_reminder', severity: 'info',
        title, body, data: { planEventId: e.id, type: e.type, date: e.date.toISOString(), daysOut },
        dedupeKey: `plan:${e.id}:${userId ?? 'all'}`,
      });
      notified++;
    }
    if (e.notifyWhatsapp) whatsappSkipped += e.assigneeUserIds.length || 1; // no staff numbers stored yet

    await prisma.crmPlanEvent.update({ where: { id: e.id }, data: { reminderSentAt: now } });
    fired++;
  }

  return NextResponse.json({ ok: true, candidates: candidates.length, fired, notified, whatsappSkipped });
}

export async function GET(req: Request) { return run(req); }
export async function POST(req: Request) { return run(req); }
