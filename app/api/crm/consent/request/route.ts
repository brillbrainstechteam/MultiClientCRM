import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { graphBase } from '@/lib/meta/config';
import { audit } from '@/lib/crm/audit';
import { contactScopeWhere } from '@/lib/crm/scope';
import {
  recordConsentRequest, needsConsentWhere, CONSENT_OPTED_IN, CONSENT_OPTED_OUT,
} from '@/lib/crm/consent';

/** Asking more than this in one go is how a number gets flagged. */
const MAX_PER_RUN = 250;
const digits = (s: string) => (s ?? '').replace(/\D/g, '');

/**
 * Send the consent request template to a set of contacts.
 *
 * Body: {
 *   contactIds?: string[],      // explicit selection
 *   all?: boolean,              // everyone currently askable (capped)
 *   templateName: string,       // an APPROVED template with the two quick replies
 *   templateLocale?: string,
 *   wording?: string,           // the body text as approved, stored as the proof
 *   nameAsFirstParam?: boolean, // {{1}} = contact name
 *   bodyParams?: string[]       // remaining {{n}} values, e.g. the business name
 * }
 *
 * Contacts already opted in or opted out are skipped rather than failed —
 * re-asking someone who said no is the single worst thing this screen could do.
 * Every send stamps consentRequestedAt and appends a 'requested' ledger row, so
 * the reply arriving at the webhook can be matched back to this ask.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!['owner', 'admin', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Your role cannot send consent requests.' }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    contactIds?: unknown; all?: boolean; templateName?: string; templateLocale?: string;
    wording?: string; nameAsFirstParam?: boolean; bodyParams?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });

  const templateName = (body.templateName ?? '').trim();
  if (!templateName) {
    return NextResponse.json({ error: 'Choose the approved consent template to send.' }, { status: 400 });
  }
  const ids = Array.isArray(body.contactIds) ? body.contactIds.map(String).filter(Boolean) : [];
  if (!ids.length && !body.all) {
    return NextResponse.json({ error: 'Select the contacts to ask, or choose everyone awaiting a request.' }, { status: 400 });
  }

  const account = await prisma.whatsAppAccount.findFirst({
    where: { tenantId: user.tenantId, status: 'connected' },
    orderBy: { connectedAt: 'desc' },
  });
  if (!account?.phoneNumberId || !account.accessToken) {
    return NextResponse.json({ error: 'Connect a WhatsApp number before collecting consent.' }, { status: 400 });
  }

  const scope = await contactScopeWhere(user);
  const where = ids.length
    ? {
        tenantId: user.tenantId,
        id: { in: ids },
        // Even an explicit selection cannot reach a decided contact.
        consent: { notIn: [CONSENT_OPTED_IN, CONSENT_OPTED_OUT] },
        ...scope,
      }
    : { ...needsConsentWhere(user.tenantId), ...scope };

  const candidates = await prisma.crmContact.findMany({
    where,
    select: { id: true, name: true, mobile: true },
    take: MAX_PER_RUN,
  });

  // One request per number, not one per contact row — duplicates in the book
  // must not become two messages to the same phone.
  const seen = new Set<string>();
  const targets = candidates.filter((c) => {
    const d = digits(c.mobile);
    if (!d || seen.has(d)) return false;
    seen.add(d);
    return true;
  });

  if (!targets.length) {
    return NextResponse.json({ error: 'No eligible contacts to ask — they are already opted in, opted out, or asked recently.' }, { status: 400 });
  }

  const token = decrypt(account.accessToken);
  const langCode = body.templateLocale || 'en';
  const fixedParams = Array.isArray(body.bodyParams) ? body.bodyParams.map(String) : [];
  const skipped = candidates.length - targets.length;
  let sent = 0;
  const failures: Array<{ contactId: string; mobile: string; error: string }> = [];

  for (const c of targets) {
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
          template: { name: templateName, language: { code: langCode }, components },
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        messages?: Array<{ id?: string }>; error?: { message?: string };
      };
      if (!res.ok) {
        failures.push({ contactId: c.id, mobile: to, error: json.error?.message ?? 'Send failed.' });
        continue;
      }
      const waMessageId = json.messages?.[0]?.id ?? null;
      await recordConsentRequest({
        tenantId: user.tenantId,
        contactId: c.id,
        mobile: c.mobile,
        templateName,
        wording: body.wording ?? null,
        actorId: user.id,
        waMessageId,
      });
      // Keep the request visible in the thread, so the agent sees what was asked.
      const convo = await prisma.conversation.upsert({
        where: {
          tenantId_phoneNumberId_contactPhone: {
            tenantId: user.tenantId, phoneNumberId: account.phoneNumberId, contactPhone: to,
          },
        },
        update: { lastMessageAt: new Date() },
        create: {
          tenantId: user.tenantId, phoneNumberId: account.phoneNumberId,
          contactPhone: to, contactName: c.name, lastMessageAt: new Date(),
        },
      });
      await prisma.message.create({
        data: {
          conversationId: convo.id,
          waMessageId,
          direction: 'outbound',
          type: 'template',
          text: body.wording || `[consent request: ${templateName}]`,
          status: 'sent',
        },
      });
      sent++;
    } catch (e) {
      failures.push({ contactId: c.id, mobile: to, error: e instanceof Error ? e.message : 'Network error' });
    }
  }

  await audit({
    tenantId: user.tenantId,
    actorId: user.id,
    action: 'consent.requested',
    targetType: 'contact',
    detail: `${templateName}: ${sent} asked, ${failures.length} failed${skipped ? `, ${skipped} skipped (duplicate number)` : ''}`,
  });

  return NextResponse.json({ asked: sent, failed: failures.length, skipped, failures: failures.slice(0, 20) });
}
