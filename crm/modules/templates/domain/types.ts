/**
 * Templates domain model (CODE_FIRST_ADAPTER.md "Domain model").
 *
 * Kept module-local (not in shared `mock-data/types.ts`) because it is
 * considerably richer than the cross-module `Template` stub other modules
 * reference by id. Only `templateId`/`familyId`/`locale`/`waba` are the
 * cross-module contract (see CODE_FIRST_ADAPTER.md "Cross-module placeholders").
 */

import type { RoleKey } from '@crm/mock-data';

export type MetaTemplateStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'in_appeal'
  | 'disabled'
  | 'paused'
  | 'unknown';

export type CrmTemplateState = 'draft' | 'normal' | 'archived' | 'deleted';

export type MetaCategory = 'marketing' | 'utility' | 'authentication';

export type TemplateFormat =
  | 'standard'
  | 'carousel'
  | 'catalogue'
  | 'authentication'
  | 'offer'
  | 'flow'
  | 'payment';

/** Internal business classification — distinct from Meta category (spec §Business use case vs Meta category). */
export type BusinessUseCase =
  | 'promotion'
  | 'product-launch'
  | 'follow-up'
  | 'order-confirmation'
  | 'dispatch-update'
  | 'payment-reminder'
  | 'appointment-reminder'
  | 'support-update'
  | 'otp'
  | 'other';

export type HeaderFormat = 'none' | 'text' | 'image' | 'video' | 'document';

export type ButtonType =
  | 'quick-reply'
  | 'website'
  | 'dynamic-website'
  | 'call-phone'
  | 'coupon'
  | 'product'
  | 'flow'
  | 'payment';

export interface TemplateVariable {
  id: string;
  /** `{{1}}`, `{{2}}`, … position in the body. */
  index: number;
  description: string;
  sampleValue: string;
}

export interface TemplateButton {
  id: string;
  type: ButtonType;
  label: string;
  /** URL / phone number / coupon code / flow id / product id, format-dependent. */
  value?: string;
  dynamic?: boolean;
}

export interface CarouselCard {
  id: string;
  order: number;
  mediaLabel: string;
  body: string;
  buttons: TemplateButton[];
}

export interface CatalogueRef {
  connected: boolean;
  catalogueId?: string;
  productIds: string[];
}

export interface AuthenticationConfig {
  codeExpiryMinutes: number;
  addSecurityDisclaimer: boolean;
}

export interface OfferConfig {
  couponCode: string;
  expiryLabel: string;
  offerText: string;
}

export interface FlowRef {
  connected: boolean;
  flowId?: string;
  flowName?: string;
}

export interface PaymentRef {
  available: boolean;
  provider?: string;
}

export interface TemplateComponents {
  headerFormat: HeaderFormat;
  headerText?: string;
  headerMediaLabel?: string;
  body: string;
  footer?: string;
  buttons: TemplateButton[];
  variables: TemplateVariable[];
  carouselCards?: CarouselCard[];
  catalogue?: CatalogueRef;
  authentication?: AuthenticationConfig;
  offer?: OfferConfig;
  flow?: FlowRef;
  payment?: PaymentRef;
}

export interface WhatsAppBusinessAccount {
  id: string;
  name: string;
  wabaMetaId: string;
  country: string;
  commerceConnected: boolean;
  catalogueConnected: boolean;
  flowAvailable: boolean;
  paymentAvailable: boolean;
  /** Roles permitted to submit/manage templates for this WABA. */
  permittedRoles: RoleKey[];
}

export interface TemplateSubmission {
  submittedAt: string;
  status: MetaTemplateStatus;
  metaReference?: string;
  rejectionReason?: string;
  rejectionExplanation?: string;
  recommendedCorrection?: string;
  appealSupported?: boolean;
}

export type InternalApprovalStage =
  | 'awaiting-review'
  | 'changes-requested'
  | 'approved-internally'
  | 'submitted-meta';

export interface InternalApproval {
  stage: InternalApprovalStage;
  reviewerId?: string;
  requestedChangesReason?: string;
  comments?: string;
}

export interface Template {
  id: string;
  /** Groups language versions of the same conceptual template. */
  familyId: string;
  wabaId: string;
  name: string;
  useCase: BusinessUseCase;
  metaCategory: MetaCategory;
  locale: string;
  localeLabel: string;
  /** Hinglish is a writing style, never an assumed Meta locale. */
  writingStyle?: 'standard' | 'hinglish';
  format: TemplateFormat;
  components: TemplateComponents;
  metaStatus: MetaTemplateStatus;
  crmState: CrmTemplateState;
  metaTemplateId?: string;
  creatorId: string;
  branchId?: string;
  teamId?: string;
  createdAt: string;
  updatedAt: string;
  librarySourceId?: string;
  favourite?: boolean;
  tags: string[];
  folder?: string;
  submissionHistory: TemplateSubmission[];
  internalApproval?: InternalApproval;
}

export type LibraryCategory = 'marketing' | 'sales' | 'service' | 'support' | 'orders-payments';

export interface TemplateLibraryItem {
  id: string;
  title: string;
  previewSnippet: string;
  useCase: BusinessUseCase;
  category: MetaCategory;
  languages: string[];
  format: TemplateFormat;
  source: 'crm-ready-made' | 'meta-provided';
  libraryCategory: LibraryCategory;
  components: TemplateComponents;
}

/** Derived repository view — never stored, never competes with `metaStatus`. */
export function isActive(template: Template): boolean {
  return (
    template.metaStatus === 'approved' &&
    template.crmState === 'normal'
  );
}
