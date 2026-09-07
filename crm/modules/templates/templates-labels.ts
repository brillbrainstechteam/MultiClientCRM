import type {
  BusinessUseCase,
  CrmTemplateState,
  MetaCategory,
  MetaTemplateStatus,
  TemplateFormat,
} from './domain/types';

export const metaStatusLabel: Record<MetaTemplateStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  in_appeal: 'In Appeal',
  disabled: 'Disabled',
  paused: 'Paused',
  unknown: 'Not submitted',
};

export const crmStateLabel: Record<CrmTemplateState, string> = {
  draft: 'Draft',
  normal: 'Normal',
  archived: 'Archived',
  deleted: 'Deleted',
};

export const useCaseLabel: Record<BusinessUseCase, string> = {
  promotion: 'Promotion',
  'product-launch': 'Product Launch',
  'follow-up': 'Follow-up',
  'order-confirmation': 'Order Confirmation',
  'dispatch-update': 'Dispatch Update',
  'payment-reminder': 'Payment Reminder',
  'appointment-reminder': 'Appointment Reminder',
  'support-update': 'Support Update',
  otp: 'OTP',
  other: 'Other',
};

export const metaCategoryLabel: Record<MetaCategory, string> = {
  marketing: 'Marketing',
  utility: 'Utility',
  authentication: 'Authentication',
};

export const formatLabel: Record<TemplateFormat, string> = {
  standard: 'Standard',
  carousel: 'Carousel',
  catalogue: 'Catalogue / Product',
  authentication: 'Authentication',
  offer: 'Offer / Coupon',
  flow: 'Flow',
  payment: 'Payment / Checkout',
};

/** Recommends a Meta category from the internal use case — the system may suggest, never silently overwrite. */
export function recommendedCategory(useCase: BusinessUseCase): MetaCategory {
  if (useCase === 'otp') return 'authentication';
  if (
    useCase === 'order-confirmation' ||
    useCase === 'dispatch-update' ||
    useCase === 'payment-reminder' ||
    useCase === 'appointment-reminder' ||
    useCase === 'support-update'
  ) {
    return 'utility';
  }
  return 'marketing';
}
