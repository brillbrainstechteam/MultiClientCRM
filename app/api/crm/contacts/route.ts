import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

/** Serialize a CrmContact row into the prototype's Contact shape. */
function toContact(c: {
  id: string; name: string; company: string | null; mobile: string; email: string | null; city: string;
  ownerId: string; stage: string; tags: string[]; source: string; consent: string; salesTier: string;
  branchId: string; primaryWhatsAppNumberId: string; createdAt: Date; lastActivityAt: Date;
}) {
  return {
    id: c.id, name: c.name, company: c.company, mobile: c.mobile, email: c.email, city: c.city,
    ownerId: c.ownerId, stage: c.stage, tags: c.tags, source: c.source, consent: c.consent,
    salesTier: c.salesTier, branchId: c.branchId, primaryWhatsAppNumberId: c.primaryWhatsAppNumberId,
    createdAt: c.createdAt.toISOString(), lastActivityAt: c.lastActivityAt.toISOString(),
  };
}

/** Create a contact for the signed-in tenant. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof b?.name === 'string' ? b.name.trim() : '';
  const mobile = typeof b?.mobile === 'string' ? b.mobile.trim() : '';
  if (!name || !mobile) {
    return NextResponse.json({ error: 'Name and mobile are required.' }, { status: 400 });
  }

  const str = (v: unknown, d = '') => (typeof v === 'string' && v.trim() ? v.trim() : d);
  const id = `contact_${Math.random().toString(36).slice(2, 10)}`;

  try {
    const created = await prisma.crmContact.create({
      data: {
        id,
        tenantId: user.tenantId,
        name,
        mobile,
        company: str(b?.company) || null,
        email: str(b?.email) || null,
        city: str(b?.city, '—'),
        ownerId: str(b?.ownerId),
        stage: str(b?.stage, 'new'),
        tags: Array.isArray(b?.tags) ? (b?.tags as unknown[]).map(String) : [],
        source: str(b?.source, 'Manual entry'),
        consent: str(b?.consent, 'pending'),
        salesTier: str(b?.salesTier, 'standard'),
        branchId: str(b?.branchId),
        primaryWhatsAppNumberId: str(b?.primaryWhatsAppNumberId),
      },
    });
    return NextResponse.json(toContact(created), { status: 201 });
  } catch (e) {
    const msg = e instanceof Error && e.message.includes('Unique')
      ? 'A contact with this mobile number already exists.'
      : 'Could not create the contact.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
