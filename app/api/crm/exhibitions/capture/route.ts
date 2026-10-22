import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';
import { routeLocation } from '@/lib/crm/zone-routing';
import { canMoveJourney, JOURNEY_STATUSES } from '@/lib/crm/visits';

/**
 * Capturing contacts at an exhibition (PRD §16, EXH-01..05).
 *
 * EXH-02 is explicit that where a tool such as Card2Leads already solves
 * capture and OCR, it should be integrated rather than rebuilt. So this route
 * accepts already-extracted fields — plus the raw text the tool returned, kept
 * verbatim — and never pretends to have done the extraction itself.
 *
 * EXH-05 is the rule that makes this more than an import: an exhibition
 * contact is a NEW customer, so it goes to Marketing for qualification rather
 * than straight to a salesperson.
 */

const CAPTURE_SOURCES = new Set(['business_card', 'register', 'import', 'manual']);
const MAX_BATCH = 500;

const normMobile = (m: string) => {
  const t = String(m ?? '').trim();
  if (!t) return '';
  return t.startsWith('+') ? t : `+91${t.replace(/\D/g, '')}`;
};

interface Captured {
  name?: string;
  company?: string;
  mobile?: string;
  email?: string;
  city?: string;
  state?: string;
  notes?: string;
  rawCapture?: string;
  cardFileId?: string;
}

/**
 * Add captured contacts to an exhibition.
 *
 * Accepts one or many, because a stall produces a stack of cards rather than
 * one at a time. Existing customers are matched on mobile rather than
 * duplicated — meeting a customer at a show is a touchpoint, not a new person.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const b = (await req.json().catch(() => null)) as {
    exhibitionId?: string;
    captureSource?: string;
    contacts?: Captured[];
    routeToCalling?: boolean;
    routeToVisit?: boolean;
  } | null;

  const exhibitionId = b?.exhibitionId ?? '';
  if (!exhibitionId) return NextResponse.json({ error: 'An exhibition is required.' }, { status: 400 });

  const exhibition = await prisma.crmExhibition.findFirst({
    where: { id: exhibitionId, tenantId: user.tenantId },
    select: { id: true, name: true },
  });
  if (!exhibition) return NextResponse.json({ error: 'Exhibition not found.' }, { status: 404 });

  const rows = Array.isArray(b?.contacts) ? b.contacts.slice(0, MAX_BATCH) : [];
  if (rows.length === 0) return NextResponse.json({ error: 'No contacts to add.' }, { status: 400 });

  const captureSource = CAPTURE_SOURCES.has(String(b?.captureSource)) ? String(b!.captureSource) : 'manual';
  const routeToCalling = b?.routeToCalling !== false;
  const routeToVisit = b?.routeToVisit === true;

  // Marketing qualifies new leads (EXH-05), so capture looks for a marketing
  // member to hand them to rather than a salesperson.
  const marketing = await prisma.user.findMany({
    where: { tenantId: user.tenantId, teamFunction: 'marketing', status: 'active' },
    select: { id: true }, orderBy: { createdAt: 'asc' },
  });

  let added = 0, matched = 0, skipped = 0;
  const problems: string[] = [];

  for (const raw of rows) {
    const name = (raw?.name ?? '').trim();
    const mobile = normMobile(raw?.mobile ?? '');
    if (!name && !mobile) { skipped++; continue; }
    if (!mobile) { skipped++; problems.push(`${name || 'A contact'} has no mobile number.`); continue; }

    try {
      const city = (raw?.city ?? '').trim();
      const routed = await routeLocation(user.tenantId, city || null, (raw?.state ?? '').trim() || null)
        .catch(() => ({ zoneId: null, zoneName: null, memberUserIds: [] as string[], assigneeUserId: null, needsPick: false }));

      // A marketing member in the lead's own zone where there is one, falling
      // back to any marketing member — MKT-01 assigns by zone.
      const zoneMarketing = marketing.find((m) => routed.memberUserIds.includes(m.id));
      const marketingOwnerId = zoneMarketing?.id ?? marketing[0]?.id ?? null;

      const existing = await prisma.crmContact.findFirst({
        where: { tenantId: user.tenantId, mobile },
        select: { id: true, name: true },
      });

      let contactId: string;
      if (existing) {
        contactId = existing.id;
        matched++;
        // Meeting an existing contact at a show is a touchpoint. Their owner
        // and lifecycle are left alone — EXH-05 is about NEW customers, and
        // reassigning an existing customer to Marketing would be wrong.
        await prisma.crmContact.update({
          where: { id: contactId },
          data: { lastActivityAt: new Date() },
        }).catch(() => undefined);
      } else {
        contactId = `contact_${Math.random().toString(36).slice(2, 10)}`;
        await prisma.crmContact.create({
          data: {
            id: contactId,
            tenantId: user.tenantId,
            name: name || mobile,
            company: (raw?.company ?? '').trim() || null,
            mobile,
            email: (raw?.email ?? '').trim() || null,
            city: city || '—',
            state: (raw?.state ?? '').trim() || null,
            // CrmContact stores the zone by name; zoneId lives on the
            // exhibition row and the visit, which are zone-scoped objects.
            zone: routed.zoneName ?? null,
            // A new lead is owned by whoever will qualify it; the sales slot
            // is filled at handoff, not now.
            ownerId: marketingOwnerId ?? user.id,
            marketingOwnerId,
            stage: 'new',
            leadStatus: 'new',
            lifecycleStage: 'prospect',
            source: 'exhibition',
            createdSource: `Exhibition: ${exhibition.name}`,
            consent: 'pending',
            salesTier: 'standard',
            branchId: 'branch_main',
            primaryWhatsAppNumberId: '',
            tags: [],
            nextFollowUpAt: routeToCalling ? new Date() : null,
          },
        });
        added++;
        await prisma.crmStageTransition.create({
          data: {
            tenantId: user.tenantId, contactId, kind: 'lead',
            fromValue: null, toValue: 'new', byUserId: user.id,
            note: `Captured at ${exhibition.name}`,
          },
        }).catch(() => undefined);
      }

      await prisma.crmExhibitionContact.upsert({
        where: { exhibitionId_contactId: { exhibitionId, contactId } },
        update: {
          captureSource,
          rawCapture: raw?.rawCapture ?? undefined,
          cardFileId: raw?.cardFileId ?? undefined,
          notes: (raw?.notes ?? '').trim() || undefined,
          routeToCalling, routeToVisit,
          zoneId: routed.zoneId ?? undefined,
        },
        create: {
          tenantId: user.tenantId, exhibitionId, contactId,
          captureSource,
          rawCapture: raw?.rawCapture ?? null,
          cardFileId: raw?.cardFileId ?? null,
          notes: (raw?.notes ?? '').trim() || null,
          journeyStatus: 'captured',
          routeToCalling, routeToVisit,
          zoneId: routed.zoneId ?? null,
        },
      });

      // EXH-03: routed to a field visit as well as, or instead of, calling.
      if (routeToVisit) {
        await prisma.crmFieldVisit.create({
          data: {
            tenantId: user.tenantId, contactId,
            assigneeUserId: routed.assigneeUserId ?? null,
            zoneId: routed.zoneId ?? null,
            status: 'planned',
            // No date was given, so it is planned for a week out — a visit
            // with no date at all would never appear in anybody's plan.
            plannedAt: new Date(Date.now() + 7 * 86_400_000),
            purpose: `Follow up from ${exhibition.name}`,
            createdByUserId: user.id,
          },
        }).catch(() => undefined);
      }
    } catch (e) {
      skipped++;
      problems.push(`${name || mobile}: ${e instanceof Error ? e.message : 'could not be added'}`);
    }
  }

  await audit({
    tenantId: user.tenantId, actorId: user.id, action: 'crm.exhibition.captured',
    targetType: 'exhibition', targetId: exhibitionId,
    detail: `${added} new, ${matched} existing, ${skipped} skipped`,
  });

  return NextResponse.json({
    added, matched, skipped,
    problems: problems.slice(0, 20),
    goesTo: marketing.length > 0
      ? 'New leads have gone to Marketing for qualification.'
      : 'No marketing member is set up, so new leads are unassigned.',
  }, { status: 201 });
}

/** Move a captured contact along its journey (EXH-04). */
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const b = (await req.json().catch(() => null)) as {
    id?: string; journeyStatus?: string; channelsUsed?: string[];
    volumeGrams?: number | null; notes?: string;
  } | null;
  const id = b?.id ?? '';
  if (!id) return NextResponse.json({ error: 'A row id is required.' }, { status: 400 });

  const existing = await prisma.crmExhibitionContact.findFirst({
    where: { id, tenantId: user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const data: Record<string, unknown> = {};

  if (typeof b?.journeyStatus === 'string') {
    if (!canMoveJourney(existing.journeyStatus, b.journeyStatus)) {
      return NextResponse.json(
        {
          error: existing.journeyStatus === 'converted'
            ? 'This lead has already converted — that cannot be undone here.'
            : `"${b.journeyStatus}" is not a status we track.`,
        },
        { status: 400 },
      );
    }
    data.journeyStatus = b.journeyStatus;
  }

  if (Array.isArray(b?.channelsUsed)) {
    data.channelsUsed = [...new Set(b.channelsUsed.map(String).filter(Boolean))].slice(0, 10);
  }
  if ('volumeGrams' in (b ?? {})) {
    const raw = b!.volumeGrams;
    if (raw === null || raw === undefined) data.volumeGrams = null;
    else {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: 'Volume must be zero or more grams.' }, { status: 400 });
      }
      data.volumeGrams = n;
    }
  }
  if ('notes' in (b ?? {})) data.notes = (typeof b!.notes === 'string' ? b!.notes.trim() : '') || null;

  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });

  const updated = await prisma.crmExhibitionContact.update({ where: { id }, data });

  // A converted exhibition lead is a customer, and the contact record should
  // say so rather than leaving the fact only in the exhibition report.
  if (data.journeyStatus === 'converted') {
    await prisma.crmContact.update({
      where: { id: existing.contactId },
      data: { lifecycleStage: 'customer', lifecycleState: 'active', activatedAt: new Date() },
    }).catch(() => undefined);
  }

  return NextResponse.json({
    contact: {
      id: updated.id,
      journeyStatus: updated.journeyStatus,
      channelsUsed: updated.channelsUsed,
      volumeGrams: updated.volumeGrams,
      notes: updated.notes,
    },
    statuses: JOURNEY_STATUSES,
  });
}
