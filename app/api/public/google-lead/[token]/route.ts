import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { processIntake } from '@/lib/crm/intake';
import { markConnectionEvent } from '@/lib/crm/connections';

/**
 * Google Ads lead-form webhook (incl. YouTube campaigns). The client pastes this
 * URL + key into their Google Ads "Webhook Integration". Google POSTs each lead
 * here; we validate the key, map the columns and run the one intake pipeline,
 * idempotent on Google's lead_id. No OAuth needed.
 *
 * The per-tenant token in the URL maps to a `google_ads` Source Connection whose
 * config.key must match the payload's google_key.
 */

const COLUMN_MAP: Record<string, string> = {
  FULL_NAME: 'name', FIRST_NAME: 'name', PHONE_NUMBER: 'mobile', EMAIL: 'email',
  CITY: 'city', REGION: 'state', POSTAL_CODE: 'postalCode', COMPANY_NAME: 'company',
};

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const conn = await prisma.crmSourceConnection.findFirst({ where: { provider: 'google_ads', externalAccountId: token } });
  if (!conn) return NextResponse.json({ error: 'Unknown form.' }, { status: 404 });

  const b = (await req.json().catch(() => ({}))) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const key = (conn.config as { key?: string } | null)?.key;
  if (key && b.google_key !== key) return NextResponse.json({ error: 'Invalid key.' }, { status: 403 });

  // Google's "Send test data" button — acknowledge without creating a lead.
  if (b.is_test === true) return NextResponse.json({ ok: true, test: true });

  const vals: Record<string, string> = {};
  for (const c of (Array.isArray(b.user_column_data) ? b.user_column_data : [])) {
    const field = COLUMN_MAP[String(c?.column_id ?? '')];
    if (field && c?.string_value) vals[field] = String(c.string_value);
  }
  if (!vals.mobile && !vals.email && !vals.name) {
    await markConnectionEvent({ tenantId: conn.tenantId, connectionId: conn.id, ok: false, error: 'Lead had no usable identity.' });
    return NextResponse.json({ ok: true });
  }

  try {
    await processIntake({
      tenantId: conn.tenantId,
      sourceType: 'google_ads',
      sourceName: conn.displayName,
      sourceId: conn.id,
      externalSourceRecordId: b.lead_id ? String(b.lead_id) : null,
      contactName: vals.name ?? null,
      accountName: vals.company ?? null,
      mobile: vals.mobile ?? null,
      email: vals.email ?? null,
      city: vals.city ?? null,
      state: vals.state ?? null,
      postalCode: vals.postalCode ?? null,
      campaignId: b.campaign_id ? String(b.campaign_id) : null,
      rawPayload: b,
    });
    await markConnectionEvent({ tenantId: conn.tenantId, connectionId: conn.id, ok: true });
  } catch (e) {
    await markConnectionEvent({ tenantId: conn.tenantId, connectionId: conn.id, ok: false, error: e instanceof Error ? e.message : 'Intake failed.' });
    return NextResponse.json({ error: 'Could not process the lead.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
