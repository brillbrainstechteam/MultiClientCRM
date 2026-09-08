import type { CrmContact } from '@prisma/client';

/**
 * Serialize a CrmContact row into the prototype's Contact shape, including the
 * requirement additions (B2B/B2C, lead status vs lifecycle, enrichment,
 * geography, interests). Shared by the bootstrap and contact APIs.
 */
export function serializeCrmContact(c: CrmContact) {
  return {
    id: c.id,
    name: c.name,
    company: c.company,
    mobile: c.mobile,
    email: c.email,
    city: c.city,
    ownerId: c.ownerId,
    stage: c.stage,
    tags: c.tags,
    source: c.source,
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
  };
}
