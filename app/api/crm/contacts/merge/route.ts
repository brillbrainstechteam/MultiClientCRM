import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

/**
 * Merge duplicate contacts into one. `primaryId` is kept; the others are folded
 * in (union of tags, and any field the primary is missing is filled from a
 * duplicate) and then deleted. Tenant-scoped.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const tenantId = user.tenantId;

  const body = (await req.json().catch(() => null)) as { primaryId?: string; duplicateIds?: unknown } | null;
  const primaryId = typeof body?.primaryId === 'string' ? body.primaryId : '';
  const duplicateIds = Array.isArray(body?.duplicateIds) ? (body!.duplicateIds as unknown[]).map(String) : [];
  if (!primaryId || duplicateIds.length === 0) {
    return NextResponse.json({ error: 'primaryId and duplicateIds are required.' }, { status: 400 });
  }

  const ids = [primaryId, ...duplicateIds];
  const rows = await prisma.crmContact.findMany({ where: { id: { in: ids }, tenantId } });
  const primary = rows.find((r) => r.id === primaryId);
  if (!primary) return NextResponse.json({ error: 'Primary contact not found.' }, { status: 404 });
  const dups = rows.filter((r) => r.id !== primaryId);

  // Union tags; backfill empty primary fields from the first duplicate that has them.
  const tags = new Set(primary.tags);
  const merged: Record<string, unknown> = {};
  const fillable = ['company', 'email', 'city', 'ownerId', 'branchId', 'primaryWhatsAppNumberId'] as const;
  for (const d of dups) {
    for (const t of d.tags) tags.add(t);
    for (const f of fillable) {
      if (!primary[f] && d[f] && merged[f] === undefined) merged[f] = d[f];
    }
  }

  await prisma.$transaction([
    prisma.crmContact.update({
      where: { id: primaryId },
      data: { ...merged, tags: [...tags], lastActivityAt: new Date() },
    }),
    prisma.crmContact.deleteMany({ where: { id: { in: dups.map((d) => d.id) }, tenantId } }),
  ]);

  return NextResponse.json({ ok: true, merged: dups.length, primaryId });
}
