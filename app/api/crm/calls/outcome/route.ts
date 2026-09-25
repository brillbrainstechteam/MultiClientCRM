import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { visibleUserIds } from '@/lib/crm/scope';
import { audit } from '@/lib/crm/audit';

/**
 * Log a call outcome from the calling plan. One action records everything:
 *   - a CrmCallLog (disposition + note),
 *   - the contact's leadStatus / nextFollowUpAt / lastFeedback / lastConnectAt,
 *   - and, for "enquiry_received", a CrmEnquiry handed to Sales.
 *
 * Body: { contactId, outcome: 'follow_up'|'not_interested'|'enquiry_received',
 *         note?, nextFollowUpAt?, enquiry?: { product, requirements } }
 */
const OUTCOMES = ['follow_up', 'not_interested', 'enquiry_received'] as const;
type Outcome = (typeof OUTCOMES)[number];
const LEAD_STATUS: Record<Outcome, string> = {
  follow_up: 'connected',
  not_interested: 'not_interested',
  enquiry_received: 'enquiry_generated',
};

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const contactId = typeof b?.contactId === 'string' ? b.contactId : '';
  const outcome = (OUTCOMES as readonly string[]).includes(String(b?.outcome)) ? (b!.outcome as Outcome) : null;
  const note = typeof b?.note === 'string' ? b.note.trim() : '';
  if (!contactId || !outcome) return NextResponse.json({ error: 'contactId and a valid outcome are required.' }, { status: 400 });

  const contact = await prisma.crmContact.findFirst({ where: { id: contactId, tenantId: user.tenantId } });
  if (!contact) return NextResponse.json({ error: 'Contact not found.' }, { status: 404 });

  // Scope guard: agents/managers can only log for contacts in their scope.
  const vis = await visibleUserIds(user);
  if (vis !== 'all' && !vis.includes(contact.ownerId)) {
    return NextResponse.json({ error: 'This contact is not assigned to you.' }, { status: 403 });
  }

  const nextFollowUpAt = outcome === 'follow_up' && typeof b?.nextFollowUpAt === 'string' && b.nextFollowUpAt
    ? new Date(b.nextFollowUpAt) : null;

  // 1) Call log.
  await prisma.crmCallLog.create({
    data: {
      tenantId: user.tenantId, contactId, mobile: contact.mobile, direction: 'outbound',
      status: 'completed', disposition: outcome, summary: note || null, byUserId: user.id, startedAt: new Date(),
    },
  });

  // 2) Contact update.
  await prisma.crmContact.update({
    where: { id: contactId },
    data: {
      leadStatus: LEAD_STATUS[outcome],
      introCallDone: true,
      lastConnectAt: new Date(),
      lastActivityAt: new Date(),
      ...(note ? { lastFeedback: note } : {}),
      nextFollowUpAt: outcome === 'follow_up' ? (nextFollowUpAt && !isNaN(nextFollowUpAt.getTime()) ? nextFollowUpAt : contact.nextFollowUpAt) : null,
    },
  });

  // 3) Enquiry received -> create a CrmEnquiry handed to Sales.
  let enquiryId: string | null = null;
  if (outcome === 'enquiry_received') {
    const enq = (b?.enquiry ?? {}) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
    // Route to a sales-department member if one exists (the "handover").
    const salesUser = await prisma.user.findFirst({
      where: { tenantId: user.tenantId, teamFunction: 'sales', status: 'active' },
      select: { id: true }, orderBy: { createdAt: 'asc' },
    });
    const count = await prisma.crmEnquiry.count({ where: { tenantId: user.tenantId } });
    const created = await prisma.crmEnquiry.create({
      data: {
        tenantId: user.tenantId, contactId, enquiryNo: `ENQ-${String(count + 1).padStart(4, '0')}`,
        source: 'call', isNew: contact.lifecycleStage !== 'customer',
        product: str(enq.product), description: str(enq.requirements) ?? (note || null),
        status: 'pending', ownerId: salesUser?.id ?? contact.kamUserId ?? null,
      },
    });
    enquiryId = created.id;
    await audit({ tenantId: user.tenantId, actorId: user.id, action: 'enquiry.handover', targetType: 'contact', targetId: contactId, detail: `${created.enquiryNo} -> sales` });
  }

  await audit({ tenantId: user.tenantId, actorId: user.id, action: 'call.logged', targetType: 'contact', targetId: contactId, detail: outcome });
  return NextResponse.json({ ok: true, outcome, enquiryId });
}
