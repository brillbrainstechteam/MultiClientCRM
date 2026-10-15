import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { notify } from '@/lib/billing/notify';
import { getCallingSettings } from '@/lib/meta/calling-api';
import { fromMetaSettings, expireStalePermissions } from '@/lib/whatsapp/calling';

export const dynamic = 'force-dynamic';

/**
 * Daily calling health check (Part 2 doc §5.11).
 *
 *   curl -fsS -H "x-cron-secret: $CRON_SECRET" \
 *        https://talktrackcrm.brillbrainsconsultants.com/api/cron/calling-health
 *
 * Two jobs, both of which exist because WhatsApp will not tell us otherwise.
 *
 * First, calling restrictions. Meta can disable or restrict calling on a number
 * — for quality, for eligibility, or because the account changed — and sends no
 * webhook for it. Without this, the first sign is an agent whose calls keep
 * failing, which is exactly the discovery route the spec says to avoid.
 *
 * Second, expired call permissions. A temporary permission lasts seven days and
 * lapses silently; Meta sends nothing when it does. Our cached "granted" would
 * otherwise keep offering a Call button that WhatsApp refuses.
 */

function cronSecret(): string {
  return (process.env.CRON_SECRET ?? '').trim().replace(/^["']|["']$/g, '');
}

function authorised(req: Request): boolean {
  const expected = cronSecret();
  if (!expected) return false;
  const got = (req.headers.get('x-cron-secret') ?? '').trim().replace(/^["']|["']$/g, '');
  return got === expected;
}

async function run(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const expired = await expireStalePermissions();

  // Only numbers whose tenant actually switched calling on. Polling settings
  // for a shop that has never used calling is noise against Meta's rate limit.
  const rows = await prisma.whatsAppCallingSettings.findMany({
    where: { enabled: true },
    select: { id: true, tenantId: true, phoneNumberId: true, metaCallingStatus: true, restrictionReason: true },
  });

  let checked = 0;
  let alerted = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const account = await prisma.whatsAppAccount.findFirst({
      where: { tenantId: row.tenantId, phoneNumberId: row.phoneNumberId },
      select: { accessToken: true, displayPhone: true },
    });
    if (!account?.accessToken) continue;

    try {
      const live = await getCallingSettings(row.phoneNumberId, decrypt(account.accessToken));
      if (!live.ok || !live.data) { errors.push(`${row.phoneNumberId}: ${live.error}`); continue; }
      checked += 1;

      const mapped = fromMetaSettings(live.data);
      const status = mapped.metaCallingStatus;
      const restricted = status != null && status !== 'ENABLED';

      await prisma.whatsAppCallingSettings.update({
        where: { id: row.id },
        data: {
          metaCallingStatus: status,
          restrictionReason: restricted
            ? `WhatsApp currently reports calling as ${status.toLowerCase()} on ${account.displayPhone ?? 'this number'}.`
            : null,
          // Keep our master switch honest. A shop whose toggle says "on" while
          // Meta has disabled calling would see a Call button that cannot work.
          ...(restricted ? { enabled: false } : {}),
          syncedAt: new Date(),
        },
      });

      // Only on the transition, so a restriction that lasts a week does not
      // produce seven identical alerts.
      if (restricted && row.metaCallingStatus === 'ENABLED') {
        await notify({
          tenantId: row.tenantId,
          category: 'whatsapp',
          kind: 'calling.restricted',
          severity: 'critical',
          dedupeKey: row.phoneNumberId,
          title: 'WhatsApp calling has been restricted',
          body: `WhatsApp now reports calling as ${status.toLowerCase()} on ${account.displayPhone ?? row.phoneNumberId}. Customers cannot reach you by voice until this is resolved.`,
        });
        alerted += 1;
      } else if (!restricted && row.metaCallingStatus != null && row.metaCallingStatus !== 'ENABLED') {
        await notify({
          tenantId: row.tenantId,
          category: 'whatsapp',
          kind: 'calling.restored',
          severity: 'info',
          dedupeKey: row.phoneNumberId,
          title: 'WhatsApp calling is working again',
          body: `Calling is enabled again on ${account.displayPhone ?? row.phoneNumberId}. Switch it back on in Settings → WhatsApp → Calling.`,
        });
        alerted += 1;
      }
    } catch (e) {
      errors.push(`${row.phoneNumberId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({ checked, alerted, permissionsExpired: expired, errors });
}

export async function GET(req: Request) { return run(req); }
export async function POST(req: Request) { return run(req); }
