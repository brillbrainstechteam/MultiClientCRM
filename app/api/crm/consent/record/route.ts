import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';
import { contactScopeWhere } from '@/lib/crm/scope';
import { recordConsent, type ConsentChannel } from '@/lib/crm/consent';

const MANUAL_CHANNELS: ConsentChannel[] = ['call', 'in_store', 'web_form', 'manual', 'import'];

/**
 * Record consent that was collected away from WhatsApp — on a call, at the
 * counter, through a form, or during an import.
 *
 * Body: {
 *   contactIds: string[],
 *   decision: 'in' | 'out',
 *   channel: 'call' | 'in_store' | 'web_form' | 'manual' | 'import',
 *   wording: string,   // required for an opt-in: what the customer agreed to
 *   source?: string,   // who collected it, which form, which import file
 *   reason?: string    // opt-outs only
 * }
 *
 * The wording is mandatory on an opt-in because an opt-in with no record of
 * what was agreed is not evidence, and evidence is the only reason to store
 * consent separately from a checkbox.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    contactIds?: unknown; decision?: string; channel?: string;
    wording?: string; source?: string; reason?: string;
  } | null;
  if (!body) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });

  const ids = Array.isArray(body.contactIds) ? body.contactIds.map(String).filter(Boolean) : [];
  if (!ids.length) return NextResponse.json({ error: 'Select at least one contact.' }, { status: 400 });

  const decision = body.decision === 'in' ? 'in' : body.decision === 'out' ? 'out' : null;
  if (!decision) return NextResponse.json({ error: 'Say whether they opted in or out.' }, { status: 400 });

  const channel = (body.channel ?? 'manual') as ConsentChannel;
  if (!MANUAL_CHANNELS.includes(channel)) {
    return NextResponse.json({ error: 'Choose how the consent was collected.' }, { status: 400 });
  }

  const wording = (body.wording ?? '').trim();
  if (decision === 'in' && wording.length < 10) {
    return NextResponse.json(
      { error: 'Record what the customer agreed to — an opt-in without its wording is not proof.' },
      { status: 400 },
    );
  }

  const scope = await contactScopeWhere(user);
  const contacts = await prisma.crmContact.findMany({
    where: { tenantId: user.tenantId, id: { in: ids }, ...scope },
    select: { id: true, mobile: true, name: true },
  });
  if (!contacts.length) return NextResponse.json({ error: 'No matching contacts in your scope.' }, { status: 404 });

  for (const c of contacts) {
    await recordConsent({
      tenantId: user.tenantId,
      contactId: c.id,
      mobile: c.mobile,
      decision,
      channel,
      source: body.source?.trim() || null,
      wording: wording || null,
      reason: body.reason?.trim() || null,
      actorId: user.id,
    });
  }

  await audit({
    tenantId: user.tenantId,
    actorId: user.id,
    action: decision === 'in' ? 'consent.opted_in' : 'consent.opted_out',
    targetType: 'contact',
    targetId: contacts.length === 1 ? contacts[0].id : null,
    detail: `${contacts.length} contact(s) via ${channel}${body.source ? ` — ${body.source}` : ''}`,
  });

  return NextResponse.json({ updated: contacts.length });
}

/** The consent ledger for one contact — ?contactId= */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const contactId = new URL(req.url).searchParams.get('contactId');
  if (!contactId) return NextResponse.json({ error: 'contactId is required.' }, { status: 400 });

  const scope = await contactScopeWhere(user);
  const contact = await prisma.crmContact.findFirst({
    where: { id: contactId, tenantId: user.tenantId, ...scope },
    select: { id: true, consent: true, consentRequestedAt: true, consentWording: true },
  });
  if (!contact) return NextResponse.json({ error: 'Contact not found.' }, { status: 404 });

  const events = await prisma.crmConsentEvent.findMany({
    where: { tenantId: user.tenantId, contactId },
    orderBy: { at: 'desc' },
    take: 50,
  });

  const actorIds = [...new Set(events.map((e) => e.actorId).filter((x): x is string => !!x))];
  const actors = actorIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } })
    : [];
  const actorName = new Map(actors.map((a) => [a.id, a.name]));

  return NextResponse.json({
    consent: contact.consent,
    requestedAt: contact.consentRequestedAt?.toISOString() ?? null,
    wording: contact.consentWording,
    events: events.map((e) => ({
      id: e.id,
      event: e.event,
      channel: e.channel,
      source: e.source,
      wording: e.wording,
      at: e.at.toISOString(),
      actor: e.actorId ? (actorName.get(e.actorId) ?? 'Team member') : 'Customer',
    })),
  });
}
