import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { prospectingAllowed } from '@/lib/crm/prospecting-access';
import { searchBusinesses } from '@/lib/crm/places';

const norm = (m: string) => (m ? (m.trim().startsWith('+') ? m.replace(/[^\d+]/g, '') : `+91${m.replace(/\D/g, '')}`) : '');

/** B2B prospecting search (locked). Returns businesses + whether each is already in the CRM. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!prospectingAllowed({ id: user.tenantId, businessModel: user.tenant.businessModel })) {
    return NextResponse.json({ error: 'Prospecting is a B2B-only, plan-gated feature and is not enabled for this account.' }, { status: 403 });
  }

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || undefined);

  try {
    const results = await searchBusinesses({
      keyword: str(b?.keyword), area: str(b?.area), district: str(b?.district),
      city: str(b?.city), state: str(b?.state), radiusKm: num(b?.radiusKm), limit: num(b?.limit),
    });

    // Flag results already present in the CRM (by normalised phone).
    const phones = results.map((r) => norm(r.phone ?? '')).filter(Boolean);
    const existing = phones.length
      ? await prisma.crmContact.findMany({ where: { tenantId: user.tenantId, mobile: { in: phones } }, select: { mobile: true } })
      : [];
    const have = new Set(existing.map((e) => e.mobile));

    return NextResponse.json({
      results: results.map((r) => ({ ...r, mobile: norm(r.phone ?? ''), existsInCrm: have.has(norm(r.phone ?? '')) })),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Search failed.' }, { status: 502 });
  }
}
