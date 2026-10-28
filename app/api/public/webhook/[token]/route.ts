import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { processIntake } from '@/lib/crm/intake';
import { markConnectionEvent } from '@/lib/crm/connections';

/**
 * Generic inbound lead webhook for websites and ecommerce (Lead Intake Hub).
 * One per-tenant URL + key that ANY site can POST to — a custom site or
 * WordPress form, a Shopify customer/order webhook, a WooCommerce order, or
 * Zapier/Make. We detect the common shapes, normalise, and run the one intake
 * pipeline. Idempotent on the source record id when present.
 *
 *   POST /api/public/webhook/<token>
 *   header x-webhook-key: <key>   (or ?key= / body.key)
 *   body: flat {name,phone,email,city,...} OR Shopify/WooCommerce payloads.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const s = (v: unknown): string | null => {
  if (v == null) return null;
  const t = String(v).trim();
  return t || null;
};

/** Pull identity fields from whatever shape arrived. */
function extract(b: any): { name: string | null; mobile: string | null; email: string | null; city: string | null; state: string | null; company: string | null; postalCode: string | null; productInterest: string | null; recordId: string | null } {
  // Shopify: top-level customer, or an order with customer + billing/default address.
  const cust = b.customer ?? (b.billing ? null : b);
  const addr = b.billing ?? b.billing_address ?? cust?.default_address ?? cust?.address ?? {};
  const first = s(b.first_name) ?? s(cust?.first_name) ?? s(addr?.first_name);
  const last = s(b.last_name) ?? s(cust?.last_name) ?? s(addr?.last_name);
  const nameJoined = [first, last].filter(Boolean).join(' ') || null;

  return {
    name: s(b.name) ?? s(b.full_name) ?? s(b.fullName) ?? nameJoined,
    mobile: s(b.mobile) ?? s(b.phone) ?? s(cust?.phone) ?? s(addr?.phone),
    email: s(b.email) ?? s(cust?.email),
    city: s(b.city) ?? s(addr?.city),
    state: s(b.state) ?? s(b.region) ?? s(addr?.province) ?? s(addr?.state),
    company: s(b.company) ?? s(b.business) ?? s(addr?.company),
    postalCode: s(b.postal_code) ?? s(b.pincode) ?? s(b.zip) ?? s(addr?.zip),
    productInterest: s(b.product) ?? s(b.product_interest) ?? s(b.interest) ?? s(b.message) ?? s(b.note),
    recordId: s(b.id) ?? s(b.order_id) ?? s(b.lead_id) ?? s(b.customer_id),
  };
}

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const conn = await prisma.crmSourceConnection.findFirst({
    where: { provider: { in: ['website', 'shopify', 'woocommerce', 'ecommerce'] }, externalAccountId: token },
  });
  if (!conn) return NextResponse.json({ error: 'Unknown webhook.' }, { status: 404 });
  if (!conn.active) return NextResponse.json({ error: 'This source is disabled.' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as any;
  const key = (conn.config as { key?: string } | null)?.key;
  const presented = req.headers.get('x-webhook-key') ?? new URL(req.url).searchParams.get('key') ?? body.key;
  if (key && presented !== key) return NextResponse.json({ error: 'Invalid key.' }, { status: 403 });

  const f = extract(body);
  if (!f.mobile && !f.email && !f.name) {
    await markConnectionEvent({ tenantId: conn.tenantId, connectionId: conn.id, ok: false, error: 'Lead had no usable identity.' });
    return NextResponse.json({ ok: true });
  }

  try {
    await processIntake({
      tenantId: conn.tenantId,
      sourceType: conn.provider === 'shopify' || conn.provider === 'woocommerce' ? 'ecommerce' : 'website_form',
      sourceName: conn.displayName,
      sourceId: conn.id,
      externalSourceRecordId: f.recordId,
      contactName: f.name,
      accountName: f.company,
      mobile: f.mobile,
      email: f.email,
      city: f.city,
      state: f.state,
      postalCode: f.postalCode,
      productInterest: f.productInterest,
      rawPayload: body,
    });
    await markConnectionEvent({ tenantId: conn.tenantId, connectionId: conn.id, ok: true });
  } catch (e) {
    await markConnectionEvent({ tenantId: conn.tenantId, connectionId: conn.id, ok: false, error: e instanceof Error ? e.message : 'Intake failed.' });
    return NextResponse.json({ error: 'Could not process the lead.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
