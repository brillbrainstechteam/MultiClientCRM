import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { graphBase } from '@/lib/meta/config';

const MAX_RECIPIENTS = 1000;
const digits = (s: string) => (s ?? '').replace(/\D/g, '');

/** Build a Prisma where-filter for CrmContact from a simple audience filter. */
function audienceWhere(tenantId: string, filter: Record<string, unknown> | null) {
  const where: Record<string, unknown> = { tenantId };
  const eq = (k: string, v: unknown) => { if (typeof v === 'string' && v) where[k] = v; };
  if (filter) {
    eq('customerType', filter.customerType);
    eq('leadStatus', filter.leadStatus);
    eq('lifecycleStage', filter.lifecycleStage);
    eq('city', filter.city);
    eq('state', filter.state);
    eq('salesTier', filter.salesTier);
    if (Array.isArray(filter.tags) && filter.tags.length) where.tags = { hasSome: filter.tags };
  }
  return where;
}

/**
 * Send a broadcast campaign: resolve the audience from real contacts (opt-out
 * suppressed, deduped by mobile), send the approved template via the Cloud API,
 * and record each recipient's result. Safeguards: opted-out suppression,
 * per-tenant dedupe, a hard recipient cap, and per-recipient error capture.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;

  const campaign = await prisma.crmCampaign.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!campaign) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
  if (!campaign.templateName) return NextResponse.json({ error: 'Attach an approved template before sending.' }, { status: 400 });
  if (campaign.status === 'sending' || campaign.status === 'completed') {
    return NextResponse.json({ error: `Campaign is already ${campaign.status}.` }, { status: 409 });
  }

  const account = await prisma.whatsAppAccount.findFirst({
    where: { tenantId: user.tenantId, status: 'connected' },
    orderBy: { connectedAt: 'desc' },
  });
  if (!account?.phoneNumberId || !account.accessToken) {
    return NextResponse.json({ error: 'No connected WhatsApp number.' }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { bodyParams?: string[]; nameAsFirstParam?: boolean };
  const fixedParams = Array.isArray(body.bodyParams) ? body.bodyParams.map(String) : [];

  // Resolve audience: matching contacts, opted-out suppressed, deduped by mobile.
  const contacts = await prisma.crmContact.findMany({
    where: { ...audienceWhere(user.tenantId, campaign.audienceFilter as Record<string, unknown> | null), consent: { not: 'opted-out' } },
    select: { id: true, name: true, mobile: true },
    take: MAX_RECIPIENTS,
  });
  const seen = new Set<string>();
  const audience = contacts.filter((c) => { const d = digits(c.mobile); if (!d || seen.has(d)) return false; seen.add(d); return true; });

  if (audience.length === 0) return NextResponse.json({ error: 'No eligible recipients for this audience.' }, { status: 400 });

  await prisma.crmCampaign.update({ where: { id }, data: { status: 'sending', totalRecipients: audience.length } });

  const token = decrypt(account.accessToken);
  const langCode = campaign.templateLocale || 'en';
  let sent = 0, failed = 0;

  for (const c of audience) {
    const to = digits(c.mobile);
    const paramTexts = [...(body.nameAsFirstParam ? [c.name || 'there'] : []), ...fixedParams];
    const components = paramTexts.length
      ? [{ type: 'body', parameters: paramTexts.map((t) => ({ type: 'text', text: t })) }]
      : [];
    try {
      const res = await fetch(`${graphBase()}/${account.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: { name: campaign.templateName, language: { code: langCode }, components },
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { messages?: Array<{ id?: string }>; error?: { message?: string } };
      if (res.ok) {
        sent++;
        await prisma.crmCampaignRecipient.create({
          data: { campaignId: id, tenantId: user.tenantId, contactId: c.id, mobile: to, status: 'sent', waMessageId: json.messages?.[0]?.id ?? null },
        });
      } else {
        failed++;
        await prisma.crmCampaignRecipient.create({
          data: { campaignId: id, tenantId: user.tenantId, contactId: c.id, mobile: to, status: 'failed', error: json.error?.message ?? 'Send failed' },
        });
      }
    } catch (e) {
      failed++;
      await prisma.crmCampaignRecipient.create({
        data: { campaignId: id, tenantId: user.tenantId, contactId: c.id, mobile: to, status: 'failed', error: e instanceof Error ? e.message : 'Network error' },
      });
    }
  }

  await prisma.crmCampaign.update({ where: { id }, data: { status: 'completed', sentCount: sent, failedCount: failed } });
  return NextResponse.json({ totalRecipients: audience.length, sent, failed });
}
