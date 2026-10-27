import { prisma } from '@/lib/db';
import { normMobile } from '@/lib/crm/mobile';
import { routeLocation } from '@/lib/crm/zone-routing';
import { audit } from '@/lib/crm/audit';
import { notify } from '@/lib/billing/notify';

/**
 * Unified intake pipeline (Lead Capture docs §5–§6). Every source normalizes to
 * one CrmIntakeEvent, then this runs:
 *
 *   NORMALIZE → VALIDATE → MATCH/DEDUPE → CLASSIFY → UPSERT CONTACT →
 *   ROUTE (record reason) → SLA → NOTIFY → AUDIT
 *
 * Idempotent: a source that supplies an external id is processed once. The B2B
 * and B2C routing *journeys* differ (marketing-first vs direct-to-store), but
 * both run through here; the difference is in how the owner is resolved, below.
 */

export interface IntakeInput {
  tenantId: string;
  sourceType: string;
  sourceId?: string | null;
  sourceName?: string | null;
  sourceDetail?: string | null;
  externalSourceRecordId?: string | null;
  customerType?: 'b2b' | 'b2c';
  accountName?: string | null;
  contactName?: string | null;
  mobile?: string | null;
  whatsappNumber?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  gstin?: string | null;
  productInterest?: string | null;
  category?: string | null;
  budgetRange?: string | null;
  occasion?: string | null;
  expectedVolume?: string | null;
  messageText?: string | null;
  notes?: string | null;
  campaignId?: string | null;
  adSetId?: string | null;
  adId?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  qrId?: string | null;
  referrerContactId?: string | null;
  branchId?: string | null;
  whatsappChannelId?: string | null;
  appointmentId?: string | null;
  rawPayload?: unknown;
  createdByUserId?: string | null;
  /** Override the default first-response SLA (minutes). null = no SLA clock. */
  slaMinutes?: number | null;
}

export interface IntakeResult {
  eventId: string;
  contactId: string | null;
  classification: string;
  status: string;
  assignedUserId: string | null;
  assignmentReason: string | null;
  duplicate: boolean;
}

// Default first-response SLA by source. Overridable per call; a real per-tenant
// config comes with the SLA engine — this is a sensible default, not hard policy.
const DEFAULT_SLA_MINUTES: Record<string, number | null> = {
  whatsapp: 60, meta_lead_ad: 60, website_form: 60, walk_in: 15, ecommerce: 120,
  qr: 120, referral: 240, exhibition: 1440, field_visit: 1440, telecalling: null,
  pos: null, manual: null,
};

const clean = (s: unknown): string | null => {
  const v = typeof s === 'string' ? s.trim() : '';
  return v || null;
};

export async function processIntake(input: IntakeInput): Promise<IntakeResult> {
  const tenantId = input.tenantId;
  const sourceType = input.sourceType;
  const customerType = input.customerType === 'b2c' ? 'b2c' : 'b2b';
  const ext = clean(input.externalSourceRecordId);

  // 1) Idempotency — a source event with an external id is processed once.
  if (ext) {
    const existing = await prisma.crmIntakeEvent.findFirst({
      where: { tenantId, sourceType, externalSourceRecordId: ext },
    });
    if (existing) {
      return {
        eventId: existing.id, contactId: existing.contactId, classification: existing.classification ?? 'DUPLICATE_EVENT',
        status: existing.status, assignedUserId: existing.assignedUserId, assignmentReason: existing.assignmentReason, duplicate: true,
      };
    }
  }

  // 2) Normalize.
  const mobile = input.mobile ? normMobile(input.mobile) : (input.whatsappNumber ? normMobile(input.whatsappNumber) : '');
  const email = clean(input.email)?.toLowerCase() ?? null;
  const contactName = clean(input.contactName) ?? clean(input.accountName);
  const sourceLabel = clean(input.sourceName) ?? sourceType;

  // Persist the raw event first (processing), so nothing is ever lost.
  const event = await prisma.crmIntakeEvent.create({
    data: {
      tenantId, sourceType, sourceId: clean(input.sourceId), sourceName: sourceLabel, sourceDetail: clean(input.sourceDetail),
      externalSourceRecordId: ext, customerType,
      accountName: clean(input.accountName), contactName, mobile: mobile || null, whatsappNumber: clean(input.whatsappNumber),
      email, city: clean(input.city), state: clean(input.state), postalCode: clean(input.postalCode), gstin: clean(input.gstin),
      productInterest: clean(input.productInterest), category: clean(input.category), budgetRange: clean(input.budgetRange),
      occasion: clean(input.occasion), expectedVolume: clean(input.expectedVolume), messageText: clean(input.messageText), notes: clean(input.notes),
      campaignId: clean(input.campaignId), adSetId: clean(input.adSetId), adId: clean(input.adId),
      utmSource: clean(input.utmSource), utmMedium: clean(input.utmMedium), utmCampaign: clean(input.utmCampaign),
      qrId: clean(input.qrId), referrerContactId: clean(input.referrerContactId), branchId: clean(input.branchId),
      whatsappChannelId: clean(input.whatsappChannelId), appointmentId: clean(input.appointmentId),
      ...(input.rawPayload && typeof input.rawPayload === 'object' ? { rawPayload: input.rawPayload as object } : {}),
      processingStatus: 'processing', status: 'new', createdByUserId: clean(input.createdByUserId),
    },
  });

  const finish = (patch: Record<string, unknown>) =>
    prisma.crmIntakeEvent.update({ where: { id: event.id }, data: patch });

  // 3) Validate — need at least one usable identity.
  if (!mobile && !email && !contactName) {
    await finish({ processingStatus: 'processed', status: 'needs_review', classification: 'NEEDS_REVIEW', reviewReason: 'No usable identity (mobile / email / name).' });
    await notify({ tenantId, category: 'lead', kind: 'intake_needs_review', severity: 'warning', title: 'Lead needs review', body: `A ${sourceLabel} lead arrived without a usable identity.`, data: { intakeEventId: event.id } });
    return { eventId: event.id, contactId: null, classification: 'NEEDS_REVIEW', status: 'needs_review', assignedUserId: null, assignmentReason: null, duplicate: false };
  }

  // 4) Match (identity) — mobile first, then email.
  const matched = mobile
    ? await prisma.crmContact.findFirst({ where: { tenantId, mobile } })
    : email
      ? await prisma.crmContact.findFirst({ where: { tenantId, email } })
      : null;

  // 5–7) Classify + resolve contact + route.
  let contactId: string;
  let assignedUserId: string | null = null;
  let assignmentReason: string;
  let zoneResolution: string | null = null;
  let classification: string;

  if (matched) {
    contactId = matched.id;
    classification =
      sourceType === 'pos' ? 'POS_CUSTOMER'
        : customerType === 'b2c' && sourceType === 'walk_in' ? 'WALK_IN_EXISTING_CUSTOMER'
          : 'EXISTING_CUSTOMER_NEW_ENQUIRY';

    // Respect the existing relationship owner — never re-route a known customer.
    if (matched.ownerId) {
      assignedUserId = matched.ownerId;
      assignmentReason = 'RELATIONSHIP_OWNER';
    } else {
      const routed = await routeLocation(tenantId, matched.city, matched.state);
      assignedUserId = routed.assigneeUserId;
      assignmentReason = assignedUserId ? 'ZONE' : 'UNASSIGNED';
      zoneResolution = routed.zoneName ? 'AUTO_RESOLVED' : 'UNKNOWN';
      if (assignedUserId) await prisma.crmContact.update({ where: { id: matched.id }, data: { ownerId: assignedUserId } });
    }

    // Attach this touch: update the CURRENT source (keep createdSource/original).
    await prisma.crmContact.update({
      where: { id: matched.id },
      data: { source: sourceLabel, lastActivityAt: new Date(), ...(clean(input.productInterest) ? { interestedIn: clean(input.productInterest) } : {}) },
    });
  } else {
    classification = sourceType === 'pos' ? 'POS_CUSTOMER' : 'NEW_PROSPECT';
    const routed = await routeLocation(tenantId, clean(input.city), clean(input.state));
    assignedUserId = routed.assigneeUserId;
    assignmentReason = assignedUserId ? 'ZONE' : 'UNASSIGNED';
    zoneResolution = routed.zoneName ? 'AUTO_RESOLVED' : 'UNKNOWN';

    const id = `contact_${Math.random().toString(36).slice(2, 10)}`;
    const created = await prisma.crmContact.create({
      data: {
        id, tenantId,
        name: contactName || input.accountName || 'Lead',
        company: clean(input.accountName),
        contactPerson: clean(input.contactName),
        customerType,
        mobile: mobile || `no-mobile-${id}`, // keep the row even if only email arrived
        email,
        city: clean(input.city) ?? '—',
        ownerId: assignedUserId ?? '', // '' = unassigned (surfaces in the queue)
        stage: 'new',
        leadStatus: 'new',
        lifecycleStage: sourceType === 'pos' ? 'customer' : 'prospect',
        tags: [],
        productInterests: clean(input.productInterest) ? [clean(input.productInterest)!] : [],
        source: sourceLabel,
        createdSource: sourceLabel, // original / first-touch — never overwritten later
        consent: 'pending',
        salesTier: 'standard',
        state: clean(input.state),
        zone: routed.zoneName,
        pincode: clean(input.postalCode),
        gstin: clean(input.gstin),
        interestedIn: clean(input.productInterest),
        branchId: clean(input.branchId) ?? 'branch_main',
        primaryWhatsAppNumberId: clean(input.whatsappChannelId) ?? '',
      },
    });
    contactId = created.id;
    await prisma.crmStageTransition.create({
      data: { tenantId, contactId, kind: 'lead', fromValue: null, toValue: 'new', byUserId: input.createdByUserId ?? null, note: `Captured via ${sourceLabel}` },
    });
  }

  // 8) SLA clock.
  const slaMinutes = input.slaMinutes !== undefined ? input.slaMinutes : (DEFAULT_SLA_MINUTES[sourceType] ?? 60);
  const now = new Date();
  const slaStartedAt = slaMinutes != null ? now : null;
  const slaDueAt = slaMinutes != null ? new Date(now.getTime() + slaMinutes * 60_000) : null;

  const status = assignedUserId ? 'routed' : 'new'; // unassigned stays 'new' with reason UNASSIGNED

  await finish({
    processingStatus: 'processed', status, classification, contactId,
    assignedUserId, assignmentReason, zoneResolution, slaStartedAt, slaDueAt,
  });

  // 9) Notify.
  if (assignedUserId) {
    await notify({ tenantId, userId: assignedUserId, category: 'lead', kind: 'lead_assigned', severity: 'info', title: 'New lead assigned', body: `${classification.replace(/_/g, ' ').toLowerCase()} via ${sourceLabel}${contactName ? ` — ${contactName}` : ''}.`, data: { intakeEventId: event.id, contactId }, dedupeKey: `lead:${event.id}` });
  } else {
    await notify({ tenantId, category: 'lead', kind: 'lead_unassigned', severity: 'warning', title: 'Lead needs assignment', body: `A ${sourceLabel} lead could not be auto-routed${contactName ? ` — ${contactName}` : ''}.`, data: { intakeEventId: event.id, contactId }, dedupeKey: `lead:${event.id}` });
  }

  // 10) Audit.
  await audit({ tenantId, actorId: input.createdByUserId ?? null, action: 'intake.processed', targetType: 'intake_event', targetId: event.id, detail: `${sourceLabel}: ${classification} → ${assignmentReason}` });

  return { eventId: event.id, contactId, classification, status, assignedUserId, assignmentReason, duplicate: false };
}
