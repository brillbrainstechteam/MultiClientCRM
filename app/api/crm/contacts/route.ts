import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { serializeCrmContact } from '@/lib/crm/contact-serialize';

/**
 * Create a contact for the signed-in tenant.
 *
 * Requirement-driven validation (Contacts reqs 4,7,8): mandatory fields depend
 * on customer type — B2B needs business name (company) + contact person +
 * mobile; B2C needs name + mobile. Everything else is progressive (req 12,13).
 * An initial lead-status transition is logged (req 43).
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const str = (v: unknown, d = '') => (typeof v === 'string' && v.trim() ? v.trim() : d);
  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean) : []);

  const customerType = str(b?.customerType, 'b2b') === 'b2c' ? 'b2c' : 'b2b';
  const name = str(b?.name);
  const company = str(b?.company) || null;
  const contactPerson = str(b?.contactPerson) || null;
  const mobile = str(b?.mobile);

  // Per-type mandatory fields.
  if (!mobile) return NextResponse.json({ error: 'Mobile number is required.' }, { status: 400 });
  if (customerType === 'b2b') {
    if (!company) return NextResponse.json({ error: 'Business name is required for a B2B contact.' }, { status: 400 });
    if (!contactPerson) return NextResponse.json({ error: 'Contact person is required for a B2B contact.' }, { status: 400 });
  } else if (!name) {
    return NextResponse.json({ error: 'Contact name is required for a B2C contact.' }, { status: 400 });
  }

  const displayName = name || contactPerson || company || 'Contact';
  const leadStatus = str(b?.leadStatus, 'new');
  const id = `contact_${Math.random().toString(36).slice(2, 10)}`;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.crmContact.create({
        data: {
          id,
          tenantId: user.tenantId,
          name: displayName,
          company,
          contactPerson,
          customerType,
          mobile,
          email: str(b?.email) || null,
          city: str(b?.city, '—'),
          ownerId: str(b?.ownerId),
          stage: str(b?.stage, 'new'),
          leadStatus,
          lifecycleStage: str(b?.lifecycleStage, 'prospect'),
          tags: arr(b?.tags),
          productInterests: arr(b?.productInterests),
          source: str(b?.source, 'Manual entry'),
          createdSource: str(b?.source, 'Manual entry'),
          consent: str(b?.consent, 'pending'),
          consentOptInSource: str(b?.consentOptInSource) || null,
          salesTier: str(b?.salesTier, 'standard'),
          businessValue: str(b?.businessValue) || null,
          gstin: str(b?.gstin) || null,
          legalName: str(b?.legalName) || null,
          state: str(b?.state) || null,
          zone: str(b?.zone) || null,
          pincode: str(b?.pincode) || null,
          branchId: str(b?.branchId, 'branch_main'),
          primaryWhatsAppNumberId: str(b?.primaryWhatsAppNumberId),
        },
      });
      await tx.crmStageTransition.create({
        data: { tenantId: user.tenantId, contactId: c.id, kind: 'lead', fromValue: null, toValue: leadStatus, byUserId: user.id, note: 'Contact created' },
      });
      return c;
    });
    return NextResponse.json(serializeCrmContact(created), { status: 201 });
  } catch (e) {
    const msg = e instanceof Error && e.message.includes('Unique')
      ? 'A contact with this mobile number already exists.'
      : 'Could not create the contact.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
