import { NextResponse } from 'next/server';
import { processBreaches } from '@/lib/crm/sla';

export const dynamic = 'force-dynamic';

/**
 * First-response SLA sweep. Run every few minutes:
 *
 *   curl -fsS -H "x-cron-secret: $CRON_SECRET" \
 *        https://talktrackcrm.brillbrainsconsultants.com/api/cron/lead-sla
 *
 * Flags intake events whose first-response deadline passed with no human action
 * yet, and escalates (assignee → managers). Idempotent — each event escalates
 * once. Does not auto-reassign.
 */
function cronSecret(): string {
  return (process.env.CRON_SECRET ?? '').trim().replace(/^["']|["']$/g, '');
}
function presentedSecret(req: Request): string {
  const header = req.headers.get('x-cron-secret');
  const query = new URL(req.url).searchParams.get('secret');
  return (header ?? query ?? '').trim();
}

async function run(req: Request): Promise<Response> {
  const secret = cronSecret();
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 500 });
  if (presentedSecret(req) !== secret) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const result = await processBreaches();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: Request) { return run(req); }
export async function POST(req: Request) { return run(req); }
