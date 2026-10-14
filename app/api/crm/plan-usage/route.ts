import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getPlanUsageSummary } from '@/lib/billing/limits';

/**
 * Where the tenant stands against every plan limit.
 *
 * A limit that only shows up as a 402 at the moment someone is blocked is a bad
 * experience — the operator needs to see the wall coming. This feeds the usage
 * meters on the Billing page.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  return NextResponse.json(await getPlanUsageSummary(user.tenantId));
}
