import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { processIntake } from '@/lib/crm/intake';
import { recordConsent } from '@/lib/crm/consent';
import { normMobile } from '@/lib/crm/mobile';

/**
 * Public lead-capture form submission (no auth). The URL token identifies the
 * tenant and its form; everything flows through the same intake pipeline as any
 * other source, so a form lead is matched, classified, routed and SLA-tracked
 * exactly like the rest.
 *
 * The form's B2B/B2C shape is the tenant's onboarding mode — never chosen here.
 */

const str = (v: unknown, max = 500): string | null => {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
};

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  const tenant = await prisma.tenant.findUnique({
    where: { leadFormToken: token },
    select: { id: true, businessModel: true, leadFormEnabled: true },
  });
  if (!tenant || !tenant.leadFormEnabled) {
    return NextResponse.json({ error: 'This form is not available.' }, { status: 404 });
  }

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // Honeypot: a real person never fills a hidden field. Accept silently so a bot
  // gets a success and no lead is created.
  if (str(b.company_website)) return NextResponse.json({ ok: true });

  const mobileRaw = str(b.mobile);
  const name = str(b.name) ?? str(b.contactName);
  const accountName = str(b.accountName);
  if (!mobileRaw && !name && !accountName) {
    return NextResponse.json({ error: 'Please enter at least your name or mobile number.' }, { status: 400 });
  }

  const customerType = tenant.businessModel === 'b2c' ? 'b2c' : 'b2b';
  const result = await processIntake({
    tenantId: tenant.id,
    sourceType: 'website_form',
    sourceName: 'Lead form',
    customerType,
    accountName,
    contactName: name,
    mobile: mobileRaw,
    whatsappNumber: str(b.whatsapp) ?? mobileRaw,
    email: str(b.email),
    city: str(b.city),
    state: str(b.state),
    gstin: str(b.gstin),
    productInterest: str(b.productInterest),
    category: str(b.category),
    budgetRange: str(b.budgetRange),
    occasion: str(b.occasion),
    expectedVolume: str(b.expectedVolume),
    notes: str(b.notes, 2000),
  });

  // WhatsApp/contact opt-in checkbox → record consent with evidence.
  const consented = b.consent === true || b.consent === 'true' || b.consent === 'on';
  if (consented && result.contactId && mobileRaw) {
    await recordConsent({
      tenantId: tenant.id,
      contactId: result.contactId,
      mobile: normMobile(mobileRaw),
      decision: 'in',
      channel: 'web_form',
      source: 'Public lead form',
      wording: 'I agree to be contacted on WhatsApp / phone about my enquiry.',
    }).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
}
