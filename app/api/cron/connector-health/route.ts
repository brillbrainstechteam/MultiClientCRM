import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { notify } from '@/lib/billing/notify';
import { audit } from '@/lib/crm/audit';

export const dynamic = 'force-dynamic';

/**
 * Lead-source connector health (Lead Intake Hub — Connector Monitoring). Run
 * daily:
 *
 *   curl -fsS -H "x-cron-secret: $CRON_SECRET" \
 *        https://talktrackcrm.brillbrainsconsultants.com/api/cron/connector-health
 *
 * Catches expiring/expired delegated tokens so a source is marked degraded or
 * disconnected BEFORE leads start silently failing. It checks token validity,
 * not silence — a quiet source that still has a live token is healthy.
 */
function cronSecret(): string {
  return (process.env.CRON_SECRET ?? '').trim().replace(/^["']|["']$/g, '');
}
function presentedSecret(req: Request): string {
  const header = req.headers.get('x-cron-secret');
  const query = new URL(req.url).searchParams.get('secret');
  return (header ?? query ?? '').trim();
}

const DAY = 86_400_000;

async function run(req: Request): Promise<Response> {
  const secret = cronSecret();
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 500 });
  if (presentedSecret(req) !== secret) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const now = Date.now();
  // Delegated credentials with an expiry inside the next 7 days (or already past).
  const creds = await prisma.crmOAuthCredential.findMany({
    where: { expiresAt: { not: null, lte: new Date(now + 7 * DAY) }, connectionId: { not: null } },
    select: { id: true, tenantId: true, connectionId: true, provider: true, expiresAt: true },
  });

  let degraded = 0, disconnected = 0;
  for (const c of creds) {
    if (!c.connectionId || !c.expiresAt) continue;
    const conn = await prisma.crmSourceConnection.findUnique({ where: { id: c.connectionId } });
    if (!conn || !conn.active) continue;

    const expired = c.expiresAt.getTime() <= now;
    const nextStatus = expired ? 'disconnected' : 'degraded';
    const nextAuth = expired ? 'expired' : conn.authStatus;
    if (conn.status === nextStatus) continue; // already flagged — no repeat alert

    await prisma.crmSourceConnection.update({
      where: { id: conn.id },
      data: { status: nextStatus, authStatus: nextAuth, lastError: expired ? 'Access token expired — reconnect this source.' : 'Access token expires soon — reconnect to avoid losing leads.' },
    });
    await notify({
      tenantId: c.tenantId, category: 'lead',
      kind: expired ? 'connector_expired' : 'connector_expiring',
      severity: expired ? 'critical' : 'warning',
      title: expired ? `Lead source disconnected: ${conn.displayName}` : `Lead source expiring: ${conn.displayName}`,
      body: expired ? 'Its access token expired. Reconnect it to resume capturing leads.' : `Its access token expires ${new Date(c.expiresAt).toDateString()}. Reconnect to avoid losing leads.`,
      data: { connectionId: conn.id, provider: c.provider },
      dedupeKey: `conn:${conn.id}:${nextStatus}`,
    });
    await audit({ tenantId: c.tenantId, actorId: null, action: `connection.${nextStatus}`, targetType: 'source_connection', targetId: conn.id, detail: `${c.provider}: token ${expired ? 'expired' : 'expiring'}` });
    if (expired) disconnected += 1; else degraded += 1;
  }

  return NextResponse.json({ ok: true, checked: creds.length, degraded, disconnected });
}

export async function GET(req: Request) { return run(req); }
export async function POST(req: Request) { return run(req); }
