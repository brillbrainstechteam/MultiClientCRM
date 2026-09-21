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

/** Create an enquiry. enquiryNo is generated per-tenant (ENQ-0001…). */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });

  const count = await prisma.crmEnquiry.count({ where: { tenantId: user.tenantId } });
  const enquiryNo = str(b.enquiryNo) || `ENQ-${String(count + 1).padStart(4, '0')}`;

  const created = await prisma.crmEnquiry.create({
    data: {
      tenantId: user.tenantId,
      contactId: str(b.contactId) || null,
      conversationId: str(b.conversationId) || null,
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
  });
  return NextResponse.json(serializeEnquiry(created), { status: 201 });
}
