import type { CrmContact } from '@prisma/client';

/**
 * Serialize a CrmContact row into the prototype's Contact shape, including the
 * requirement additions (B2B/B2C, lead status vs lifecycle, enrichment,
 * geography, interests). Shared by the bootstrap and contact APIs.
 */
export function serializeCrmContact(c: CrmContact) {
  const jp = (c.jewelleryProfile ?? {}) as Record<string, unknown>;
  return {
    id: c.id,
    name: c.name,
    company: c.company,
    mobile: c.mobile,
    email: c.email,
    city: c.city,
    ownerId: c.ownerId,
    marketingOwnerId: c.marketingOwnerId,
    stage: c.stage,
    tags: c.tags,
    source: c.source,
    // Click-to-WhatsApp acquisition: which ad won this customer.
    adSourceId: c.adSourceId,
    adSourceType: c.adSourceType,
    adSourceUrl: c.adSourceUrl,
    adHeadline: c.adHeadline,
    ctwaClid: c.ctwaClid,
    adReferralAt: c.adReferralAt ? c.adReferralAt.toISOString() : null,
    consent: c.consent,
    salesTier: c.salesTier,
    branchId: c.branchId,
    primaryWhatsAppNumberId: c.primaryWhatsAppNumberId,
    createdAt: c.createdAt.toISOString(),
    lastActivityAt: c.lastActivityAt.toISOString(),
    customerType: c.customerType,
    contactPerson: c.contactPerson,
    leadStatus: c.leadStatus,
    lifecycleStage: c.lifecycleStage,
    lifecycleState: c.lifecycleState,
    activatedAt: c.activatedAt ? c.activatedAt.toISOString() : null,
    gstin: c.gstin,
    legalName: c.legalName,
    billingAddress: c.billingAddress,
    shippingAddress: c.shippingAddress,
    state: c.state,
    zone: c.zone,
    pincode: c.pincode,
    productInterests: c.productInterests,
    businessValue: c.businessValue,
    consentOptInSource: c.consentOptInSource,
    consentOptInAt: c.consentOptInAt ? c.consentOptInAt.toISOString() : null,
    consentOptOutAt: c.consentOptOutAt ? c.consentOptOutAt.toISOString() : null,
    consentRequestedAt: c.consentRequestedAt ? c.consentRequestedAt.toISOString() : null,
    consentWording: c.consentWording,
    // --- Jewellery B2B enrichment ---
    businessSegment: c.businessSegment,
    grade: c.grade,
    preferredLanguage: c.preferredLanguage,
    website: c.website,
    dateOfBirth: c.dateOfBirth ? c.dateOfBirth.toISOString() : null,
    companyAnniversary: c.companyAnniversary ? c.companyAnniversary.toISOString() : null,
    nextFollowUpAt: c.nextFollowUpAt ? c.nextFollowUpAt.toISOString() : null,
    interestedIn: c.interestedIn,
    lastFeedback: c.lastFeedback,
    lastConnectAt: c.lastConnectAt ? c.lastConnectAt.toISOString() : null,
    clientCode: c.clientCode,
    pan: c.pan,
    kamUserId: c.kamUserId,
    dataVerified: c.dataVerified,
    introCallDone: c.introCallDone,
    officeVisitDone: c.officeVisitDone,
    inBroadcastList: c.inBroadcastList,
    inCommunity: c.inCommunity,
    jewelleryProfile: c.jewelleryProfile ?? null,
    // --- Prospect journey (Prospects Tracker, stored in JSON) ---
    typeOfLead: (jp.typeOfLead as string) ?? null,
    reference: (jp.reference as string) ?? null,
    dataManagerId: (jp.dataManagerId as string) ?? null,
    // The two owner slots are real columns — `ownerId` IS the sales owner.
    // `salesOwnerId` is kept as an alias because the drawer and Customer 360
    // read it under that name. They used to come out of jewelleryProfile,
    // which meant the UI showed one thing and visibility used another.
    salesOwnerId: c.ownerId || null,
    whichExhibition: (jp.whichExhibition as string) ?? null,
    invoiceNo: (jp.invoiceNo as string) ?? null,
    journey: (jp.journey as Record<string, string | null>) ?? {},
  };
}
