import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import type { CrmEnquiry } from '@prisma/client';

/**
 * Enquiries — the structured record a rep logs from a WhatsApp conversation
 * (formalises the jewellery "Enquiry Tracker"). Linked to a contact and the
 * originating conversation so marketing + the KAM see the same record.
 */

export function serializeEnquiry(e: CrmEnquiry) {
  return {
    id: e.id,
    contactId: e.contactId,
    conversationId: e.conversationId,
    enquiryNo: e.enquiryNo,
    source: e.source,
    isNew: e.isNew,
    product: e.product,
    design: e.design,
    weightRange: e.weightRange,
    sizeLength: e.sizeLength,
    pcs: e.pcs,
    tentativeWeight: e.tentativeWeight,
    description: e.description,
    imagesSentAt: e.imagesSentAt ? e.imagesSentAt.toISOString() : null,
    status: e.status,
    remarks: e.remarks,
    ownerId: e.ownerId,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

const str = (v: unknown, d = '') => (typeof v === 'string' && v.trim() ? v.trim() : d);
const int = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : null);

/** List enquiries, optionally filtered by status or contact/conversation. */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const where: Record<string, unknown> = { tenantId: user.tenantId };
  const status = searchParams.get('status');
  const contactId = searchParams.get('contactId');
  const conversationId = searchParams.get('conversationId');
  if (status) where.status = status;
  if (contactId) where.contactId = contactId;
  if (conversationId) where.conversationId = conversationId;

  const rows = await prisma.crmEnquiry.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 });
  return NextResponse.json({ enquiries: rows.map(serializeEnquiry) });
}

/**
 * Next enquiry number for a tenant.
 *
 * Derived from the highest number already issued, not from a row COUNT: a count
 * repeats a number as soon as any enquiry is deleted, and `enquiryNo` is now
 * unique per tenant, so that collision would start rejecting valid enquiries.
 */
async function nextEnquiryNo(tenantId: string): Promise<string> {
  const rows = await prisma.crmEnquiry.findMany({
    where: { tenantId, enquiryNo: { startsWith: 'ENQ-' } },
    select: { enquiryNo: true },
    orderBy: { enquiryNo: 'desc' },
    take: 1,
  });
  const highest = rows[0]?.enquiryNo ?? '';
  const n = Number.parseInt(highest.replace(/^ENQ-/, ''), 10);
  return `ENQ-${String((Number.isFinite(n) ? n : 0) + 1).padStart(4, '0')}`;
}

/**
 * Create an enquiry. A contact may have any number of them — this is the whole
 * point of the enquiry tracker, so nothing here is one-per-contact.
 *
 * enquiryNo is generated per tenant (ENQ-0001…) and retried on the unique
 * constraint, which is what makes two reps logging at the same moment safe.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });

  // An enquiry filed against a contact that does not exist is invisible in
  // Customer 360 and silently inflates the funnel, so the link is checked.
  const contactId = str(b.contactId) || null;
  if (contactId) {
    const exists = await prisma.crmContact.findFirst({
      where: { id: contactId, tenantId: user.tenantId },
      select: { id: true },
    });
    if (!exists) return NextResponse.json({ error: 'That contact does not exist.' }, { status: 400 });
  }
  // The conversation link is best-effort: drop it rather than reject the
  // enquiry, since losing the typed details matters more than the back-link.
  const rawConversationId = str(b.conversationId) || null;
  const conversationId = rawConversationId
    ? (await prisma.conversation.findFirst({
        where: { id: rawConversationId, tenantId: user.tenantId }, select: { id: true },
      }))?.id ?? null
    : null;

  const created = await createWithRetry(user.tenantId, async (enquiryNo) => prisma.crmEnquiry.create({
    data: {
      tenantId: user.tenantId,
      contactId,
      conversationId,
      enquiryNo,
      source: str(b.source) || 'whatsapp',
      isNew: b.isNew === undefined ? true : Boolean(b.isNew),
      product: str(b.product) || null,
      design: str(b.design) || null,
      weightRange: str(b.weightRange) || null,
      sizeLength: str(b.sizeLength) || null,
      pcs: int(b.pcs),
      tentativeWeight: str(b.tentativeWeight) || null,
      description: str(b.description) || null,
      status: str(b.status, 'pending'),
      remarks: str(b.remarks) || null,
      ownerId: str(b.ownerId) || user.id,
    },
  }), str(b.enquiryNo) || null);

  if (!created) {
    return NextResponse.json({ error: 'Could not allocate an enquiry number — try again.' }, { status: 409 });
  }
  return NextResponse.json(serializeEnquiry(created), { status: 201 });
}

/**
 * Allocate a number and create, retrying when another request took the same one
 * a moment earlier (Prisma P2002 on the tenant+number unique index). An explicit
 * number from the caller is used as-is and never retried — if it clashes, that
 * is a real conflict the caller needs to hear about.
 */
async function createWithRetry(
  tenantId: string,
  create: (enquiryNo: string) => Promise<CrmEnquiry>,
  explicitNo: string | null,
): Promise<CrmEnquiry | null> {
  if (explicitNo) return create(explicitNo);
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await create(await nextEnquiryNo(tenantId));
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== 'P2002') throw e;
    }
  }
  return null;
}
