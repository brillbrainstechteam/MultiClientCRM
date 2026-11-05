import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { prospectingAllowed } from '@/lib/crm/prospecting-access';
import { discoverBusinesses } from '@/lib/crm/prospecting-ai';
import { estimateRunCost } from '@/lib/crm/prospecting-cost';

/**
 * AI business discovery (Find New Businesses). Given a free-text brief, returns
 * candidate businesses to prospect, each flagged if it already looks present in
 * the CRM (best-effort name match — the AI doesn't return phone numbers).
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!prospectingAllowed({ id: user.tenantId, businessModel: user.tenant.businessModel })) {
    return NextResponse.json({ error: 'Business discovery is a B2B-only feature and is not enabled for this account.' }, { status: 403 });
  }

  const b = (await req.json().catch(() => null)) as { brief?: string; count?: number } | null;
  const brief = typeof b?.brief === 'string' ? b.brief.trim() : '';
  if (!brief) return NextResponse.json({ error: 'Describe who you want to find.' }, { status: 400 });

  try {
    const { results: found, usage, provider } = await discoverBusinesses(brief, typeof b?.count === 'number' ? b.count : 15);

    // Best-effort: flag names that already appear in the CRM company/name.
    const names = found.map((f) => f.name.toLowerCase());
    const existing = names.length
      ? await prisma.crmContact.findMany({
          where: { tenantId: user.tenantId, OR: [{ company: { in: found.map((f) => f.name) } }, { name: { in: found.map((f) => f.name) } }] },
          select: { company: true, name: true },
        })
      : [];
    const have = new Set(existing.flatMap((e) => [e.company?.toLowerCase(), e.name?.toLowerCase()].filter(Boolean) as string[]));

    return NextResponse.json({
      results: found.map((f) => ({ ...f, existsInCrm: have.has(f.name.toLowerCase()) })),
      cost: estimateRunCost(usage),
      provider,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Discovery failed.' }, { status: 502 });
  }
}
