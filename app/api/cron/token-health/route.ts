import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { inspectToken } from '@/lib/meta/graph';
import { notify, type NotifySeverity } from '@/lib/billing/notify';

export const dynamic = 'force-dynamic';

/**
 * Daily check that every connected number's access token is still alive.
 *
 *   curl -fsS -H "x-cron-secret: $CRON_SECRET" \
 *        https://talktrackcrm.brillbrainsconsultants.com/api/cron/token-health
 *
 * Why this has to exist: the Facebook Login for Business configuration fixes
 * the token lifetime when it is created — 60 days or never — and **it cannot be
 * changed afterwards**. On a 60-day configuration, every customer's connection
 * stops working two months after they onboard. Without this job the first sign
 * is a failed send, by which point messages have already been missed.
 *
 * Meta does not offer a refresh for a business token: recovery is the customer
 * reconnecting through Embedded Signup. So the job's whole purpose is to give
 * enough warning that reconnecting is a scheduled task rather than an outage.
 *
 * It also catches the other way a token dies — the customer revoking the
 * Business Integration on Facebook — which otherwise surfaces the same way.
 */

/** Warn at these distances out, so the message escalates rather than nags. */
const WARN_DAYS = [14, 7, 3, 1];
const DAY = 86_400_000;

async function run(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 500 });
  const sent = req.headers.get('x-cron-secret') ?? new URL(req.url).searchParams.get('secret');
  if (sent !== secret) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const now = new Date();
  const accounts = await prisma.whatsAppAccount.findMany({
    where: { status: 'connected', accessToken: { not: null } },
    select: {
      id: true, tenantId: true, displayPhone: true, verifiedName: true,
      accessToken: true, tokenExpiresAt: true,
    },
  });

  let checked = 0, expiring = 0, invalid = 0, healthy = 0;

  for (const a of accounts) {
    if (!a.accessToken) continue;
    checked += 1;

    const info = await inspectToken(decrypt(a.accessToken)).catch(() => null);
    const label = a.verifiedName || a.displayPhone || 'your WhatsApp number';

    // A network blip is not a dead token — leave the state alone and retry
    // tomorrow rather than alarming anyone.
    if (!info) continue;

    const expiresAt = info.expiresAt ? new Date(info.expiresAt * 1000) : null;
    await prisma.whatsAppAccount.update({
      where: { id: a.id },
      data: { tokenExpiresAt: expiresAt, tokenCheckedAt: now },
    });

    if (!info.isValid) {
      invalid += 1;
      await prisma.whatsAppAccount.update({
        where: { id: a.id },
        data: {
          status: 'reconnect_required',
          statusReason: info.error ?? 'Meta reports the access token is no longer valid.',
        },
      });
      await notify({
        tenantId: a.tenantId,
        category: 'whatsapp',
        kind: 'token_invalid',
        severity: 'critical',
        title: `WhatsApp disconnected: ${label}`,
        body: 'Meta no longer accepts the stored access token. Reconnect the number to resume sending and receiving.',
        data: { accountId: a.id, reason: info.error },
        dedupeKey: `token:${a.id}:invalid`,
      }).catch(() => {});
      continue;
    }

    if (!expiresAt) { healthy += 1; continue; }

    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / DAY);
    // One notification per threshold crossed, deduped on the threshold itself,
    // so a daily job does not produce a daily nag.
    const threshold = WARN_DAYS.find((d) => daysLeft <= d);
    if (threshold === undefined) { healthy += 1; continue; }

    expiring += 1;
    const severity: NotifySeverity = daysLeft <= 3 ? 'critical' : 'warning';
    await notify({
      tenantId: a.tenantId,
      category: 'whatsapp',
      kind: 'token_expiring',
      severity,
      title: daysLeft <= 0
        ? `WhatsApp access expired: ${label}`
        : `WhatsApp access expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}: ${label}`,
      body: daysLeft <= 0
        ? 'Reconnect the number to resume sending and receiving.'
        : 'Meta issues this access for a fixed period and it cannot be renewed automatically. '
          + 'Reconnect the number before it lapses to avoid an interruption.',
      data: { accountId: a.id, expiresAt: expiresAt.toISOString(), daysLeft },
      dedupeKey: `token:${a.id}:expiring:${threshold}`,
    }).catch(() => {});
  }

  return NextResponse.json({ checked, healthy, expiring, invalid, at: now.toISOString() });
}

export async function GET(req: Request) { return run(req); }
export async function POST(req: Request) { return run(req); }
