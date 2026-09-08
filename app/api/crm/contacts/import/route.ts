import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

type Row = Record<string, unknown>;

const norm = (m: string) => {
  const t = m.trim();
  if (!t) return '';
  return t.startsWith('+') ? t : `+91${t.replace(/\D/g, '')}`;
};
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v));

/**
 * Bulk-import contacts from parsed rows, de-duplicating by mobile within the
 * tenant. `onDuplicate` = 'skip' leaves existing rows untouched; 'update' merges
 * the incoming fields into the existing contact.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const tenantId = user.tenantId;

  const body = (await req.json().catch(() => null)) as { rows?: Row[]; onDuplicate?: string } | null;
  const rows = Array.isArray(body?.rows) ? body!.rows : [];
  const onDuplicate = body?.onDuplicate === 'update' ? 'update' : 'skip';
  if (rows.length === 0) return NextResponse.json({ error: 'No rows to import.' }, { status: 400 });

  const existing = await prisma.crmContact.findMany({ where: { tenantId }, select: { id: true, mobile: true } });
  const byMobile = new Map(existing.map((c) => [c.mobile, c.id]));

  let created = 0, updated = 0, skipped = 0;
  const seen = new Set<string>();

  for (const r of rows) {
    const name = str(r.name || r.Name);
    const mobile = norm(str(r.mobile || r.Mobile || r.phone || r.Phone));
    if (!name || !mobile || seen.has(mobile)) { skipped++; continue; }
    seen.add(mobile);

    const fields = {
      name,
      company: str(r.company || r.Company) || null,
      email: str(r.email || r.Email) || null,
      city: str(r.city || r.City) || '—',
      source: str(r.source || r.Source) || 'CSV import',
      stage: str(r.stage) || 'new',
      consent: str(r.consent) || 'pending',
      salesTier: str(r.salesTier || r.tier) || 'standard',
      ownerId: str(r.ownerId), branchId: str(r.branchId) || 'branch_main', primaryWhatsAppNumberId: str(r.primaryWhatsAppNumberId),
      tags: str(r.tags) ? String(r.tags).split(/[;|]/).map((t) => t.trim()).filter(Boolean) : [],
    };

    const dupId = byMobile.get(mobile);
    if (dupId) {
      if (onDuplicate === 'update') {
        await prisma.crmContact.update({ where: { id: dupId }, data: { ...fields, lastActivityAt: new Date() } });
        updated++;
      } else skipped++;
      continue;
    }
    await prisma.crmContact.create({
      data: { id: `contact_${Math.random().toString(36).slice(2, 10)}`, tenantId, mobile, ...fields },
    });
    byMobile.set(mobile, 'new');
    created++;
  }

  return NextResponse.json({ created, updated, skipped });
}
