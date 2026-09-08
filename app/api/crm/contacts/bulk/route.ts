import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

type Body = {
  ids?: unknown;
  op?: unknown;
  ownerId?: unknown;
  stage?: unknown;
  consent?: unknown;
  tags?: unknown;
  tagMode?: unknown; // 'add' | 'remove'
};

/**
 * Bulk operations on a tenant's contacts. Accepts a list of ids and an op:
 * assign (ownerId), stage, consent, tags (add/remove), or delete. All writes
 * are tenant-scoped via the id + tenantId filter.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const tenantId = user.tenantId;

  const b = (await req.json().catch(() => null)) as Body | null;
  const ids = Array.isArray(b?.ids) ? (b!.ids as unknown[]).map(String).filter(Boolean) : [];
  const op = typeof b?.op === 'string' ? b.op : '';
  if (ids.length === 0 || !op) {
    return NextResponse.json({ error: 'ids and op are required.' }, { status: 400 });
  }
  const where = { id: { in: ids }, tenantId };

  try {
    if (op === 'assign' && typeof b?.ownerId === 'string') {
      const r = await prisma.crmContact.updateMany({ where, data: { ownerId: b.ownerId, lastActivityAt: new Date() } });
      return NextResponse.json({ ok: true, affected: r.count });
    }
    if (op === 'stage' && typeof b?.stage === 'string') {
      const r = await prisma.crmContact.updateMany({ where, data: { stage: b.stage, lastActivityAt: new Date() } });
      return NextResponse.json({ ok: true, affected: r.count });
    }
    if (op === 'consent' && typeof b?.consent === 'string') {
      const r = await prisma.crmContact.updateMany({ where, data: { consent: b.consent, lastActivityAt: new Date() } });
      return NextResponse.json({ ok: true, affected: r.count });
    }
    if (op === 'delete') {
      const r = await prisma.crmContact.deleteMany({ where });
      return NextResponse.json({ ok: true, affected: r.count });
    }
    if (op === 'tags' && Array.isArray(b?.tags)) {
      // Array merge per row can't be expressed in updateMany, so update each.
      const tags = (b!.tags as unknown[]).map(String);
      const mode = b?.tagMode === 'remove' ? 'remove' : 'add';
      const rows = await prisma.crmContact.findMany({ where, select: { id: true, tags: true } });
      await prisma.$transaction(rows.map((row) => {
        const set = new Set(row.tags);
        for (const t of tags) { if (mode === 'add') set.add(t); else set.delete(t); }
        return prisma.crmContact.update({ where: { id: row.id }, data: { tags: [...set], lastActivityAt: new Date() } });
      }));
      return NextResponse.json({ ok: true, affected: rows.length });
    }
    return NextResponse.json({ error: 'Unknown or malformed op.' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Bulk operation failed.' }, { status: 400 });
  }
}
