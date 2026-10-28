import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { metaConfig } from '@/lib/meta/config';
import { prisma } from '@/lib/db';
import { decryptSecret } from '@/lib/crypto/secrets';
import { fetchLead, mapLeadFields } from '@/lib/meta/connect';
import { processIntake } from '@/lib/crm/intake';
import { markConnectionEvent } from '@/lib/crm/connections';

/**
 * Meta webhook — ONE endpoint for all tenants (Lead Ads + Page/IG messaging).
 * GET  = verification handshake.
 * POST = events. Raw event persisted first, signature verified, then routed to
 *        the owning tenant by page/IG id. Always answers 200 (Meta retries ~36h).
 *
 * Lead Ads (`leadgen`): the payload has only ids, so we fetch the lead's answers
 * with the Page token and run the one intake pipeline, idempotent on leadgen_id.
 */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token && token === metaConfig.webhookVerifyToken) {
    return new Response(challenge ?? '', { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

function verifySignature(raw: string, header: string | null): boolean {
  if (!metaConfig.appSecret) return true; // dev without a secret: don't block
  if (!header) return false;
  const expected = 'sha256=' + createHmac('sha256', metaConfig.appSecret).update(raw).digest('hex');
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ received: true }); // 200 but ignore — never leak why
  }
  const payload = (() => { try { return JSON.parse(raw); } catch { return null; } })() as any;

  try {
    await prisma.webhookEvent.create({
      data: {
        phoneNumberId: null,
        wabaId: payload?.entry?.[0]?.id ?? null,
        field: payload?.entry?.[0]?.changes?.[0]?.field ?? payload?.object ?? 'meta',
        payload: (payload ?? {}) as object,
      },
    }).catch(() => undefined);

    for (const entry of (payload?.entry ?? [])) {
      const pageId = String(entry?.id ?? '');
      for (const change of (entry?.changes ?? [])) {
        if (change?.field === 'leadgen') await handleLeadgen(pageId, change.value);
      }
    }
  } catch (err) {
    console.error('[meta-webhook] fatal', err);
  }

  return NextResponse.json({ received: true });
}

async function handleLeadgen(pageId: string, value: any) {
  const leadgenId = String(value?.leadgen_id ?? '');
  if (!leadgenId) return;

  // Route by page → connection → tenant.
  const conn = await prisma.crmSourceConnection.findFirst({ where: { provider: 'facebook', externalAccountId: pageId } });
  if (!conn) { console.error('[meta-webhook] no connection for page', pageId); return; }
  const tenantId = conn.tenantId;

  // Page token to retrieve the lead's answers.
  const cred = await prisma.crmOAuthCredential.findFirst({ where: { tenantId, provider: 'facebook_page', externalId: pageId } });
  const pageToken = decryptSecret(cred?.accessTokenEnc);
  if (!pageToken) {
    await markConnectionEvent({ tenantId, connectionId: conn.id, ok: false, error: 'No page token to retrieve the lead.' });
    return;
  }

  try {
    const lead = await fetchLead(leadgenId, pageToken);
    const m = mapLeadFields(lead.fields);
    await processIntake({
      tenantId,
      sourceType: 'meta_lead_ad',
      sourceName: conn.displayName,
      sourceId: conn.id,
      externalSourceRecordId: leadgenId, // idempotent
      contactName: m.name,
      accountName: m.company,
      mobile: m.mobile,
      email: m.email,
      city: m.city,
      productInterest: m.productInterest,
      adId: lead.adId,
      campaignId: typeof value?.campaign_id === 'string' ? value.campaign_id : null,
      adSetId: typeof value?.adgroup_id === 'string' ? value.adgroup_id : null,
      rawPayload: { leadgen: value, fields: lead.fields, formId: lead.formId, createdTime: lead.createdTime },
    });
    await markConnectionEvent({ tenantId, connectionId: conn.id, ok: true });
  } catch (e) {
    await markConnectionEvent({ tenantId, connectionId: conn.id, ok: false, error: e instanceof Error ? e.message : 'Lead retrieval failed.' });
    console.error('[meta-webhook] leadgen error', leadgenId, e);
  }
}
