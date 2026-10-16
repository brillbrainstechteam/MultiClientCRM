import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { notify } from '@/lib/billing/notify';
import { dueReminders, describeOffset, LATE_GRACE_MINUTES } from '@/lib/crm/reminders';

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

/**
 * Read the shared secret, tolerating how it was written.
 *
 * `.env.production` is hand-edited on the server and passed through Compose's
 * `env_file`, which does not strip quotes in every version — so CRON_SECRET
 * can arrive as `"abc"` with the quotes part of the value. A trailing newline
 * or a stray space does the same thing. None of that should look like a
 * failed authentication, because the resulting 403 is indistinguishable from a
 * genuinely wrong secret and sends you hunting in the wrong place.
 */
function cronSecret(): string {
  return (process.env.CRON_SECRET ?? '').trim().replace(/^["']|["']$/g, '');
}

/** The value the caller presented, by header or query string. */
function presentedSecret(req: Request): string {
  const header = req.headers.get('x-cron-secret');
  const query = new URL(req.url).searchParams.get('secret');
  return (header ?? query ?? '').trim();
}

async function run(req: Request): Promise<Response> {
  const secret = cronSecret();
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 500 });
  const sent = presentedSecret(req);
  if (sent !== secret) {
    // Say enough to tell a wrong secret from a mangled one, without echoing
    // either value back to whoever is probing.
    return NextResponse.json(
      { error: 'Forbidden.', hint: sent ? 'Secret did not match.' : 'No x-cron-secret header was received.' },
      { status: 403 },
    );
  }

  const now = new Date();
  const todayStart = startOfDay(now);

  // Anything with reminders left to deliver. The window reaches back a day so
  // an overdue reminder on a just-passed event is still considered (and then
  // either delivered or retired by the grace check), and forward a year.
  const candidates = await prisma.crmPlanEvent.findMany({
    where: {
      remindOffsets: { isEmpty: false },
      date: {
        gte: new Date(todayStart.getTime() - DAY),
        lte: new Date(todayStart.getTime() + 366 * DAY),
      },
    },
  });

  let notified = 0, fired = 0, whatsappSkipped = 0, retired = 0;
  for (const e of candidates) {
    const due = dueReminders(e, now);
    if (due.length === 0) continue;

    const label = TYPE_LABEL[e.type] ?? 'Activity';
    const prettyDate = e.allDay
      ? e.date.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })
      : e.date.toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

    const delivered: number[] = [];
    for (const r of due) {
      if (r.stale) {
        // Too late to be true. Recording it stops the job retrying forever.
        delivered.push(r.offset);
        retired++;
        continue;
      }

      const title = `Reminder: ${e.title}`;
      const body = `${label} ${describeOffset(r.offset)} (${prettyDate})${e.note ? ` — ${e.note}` : ''}`;
      const targets = e.assigneeUserIds.length ? e.assigneeUserIds : [null]; // null = tenant-wide

      for (const userId of targets) {
        await notify({
          tenantId: e.tenantId, userId, category: 'campaign', kind: 'plan_reminder', severity: 'info',
          title, body,
          data: { planEventId: e.id, type: e.type, date: e.date.toISOString(), offsetMinutes: r.offset },
          // Per offset, so the one-hour reminder is not swallowed as a
          // duplicate of the two-day one sent earlier for the same event.
          dedupeKey: `plan:${e.id}:${r.offset}:${userId ?? 'all'}`,
        });
        notified++;
      }
      if (e.notifyWhatsapp) whatsappSkipped += e.assigneeUserIds.length || 1; // no staff numbers stored yet
      delivered.push(r.offset);
      fired++;
    }

    await prisma.crmPlanEvent.update({
      where: { id: e.id },
      data: { remindersSent: { set: [...e.remindersSent, ...delivered] }, reminderSentAt: now },
    });
  }

  return NextResponse.json({
    ok: true, candidates: candidates.length, fired, notified, whatsappSkipped, retired,
    graceMinutes: LATE_GRACE_MINUTES,
  });
}

export async function GET(req: Request) { return run(req); }
export async function POST(req: Request) { return run(req); }
