import type { BadgeTone } from '@crm/design-system';
import type {
  ApprovalStatus,
  ApprovalType,
  CatalogueItemStatus,
  CatalogueStatus,
  ConnectorState,
  FulfilmentStatus,
  MediaMatchStatus,
  OrderSource,
  OrderStatus,
  OrderSyncStatus,
  PaymentOverallStatus,
  PriceMode,
  RefundStatus,
  ReturnStatus,
  ReturnType,
  SelectionStatus,
  SourceMode,
} from './domain/types';

export const sourceModeLabel: Record<SourceMode, string> = {
  integrated: 'Integrated',
  uploaded: 'Uploaded',
  'crm-managed': 'CRM-managed',
};

export const connectorStateLabel: Record<ConnectorState, string> = {
  connected: 'Connected',
  partial: 'Partially connected',
  disconnected: 'Disconnected',
  'auth-failed': 'Authentication failed',
  'mapping-required': 'Mapping required',
  stale: 'Stale',
  syncing: 'Syncing',
  'retry-queued': 'Retry queued',
  'permanent-error': 'Permanent error',
};

export const connectorStateTone: Record<ConnectorState, BadgeTone> = {
  connected: 'success',
  partial: 'info',
  disconnected: 'neutral',
  'auth-failed': 'danger',
  'mapping-required': 'warning',
  stale: 'warning',
  syncing: 'info',
  'retry-queued': 'warning',
  'permanent-error': 'danger',
};

export const priceModeLabel: Record<PriceMode, string> = {
  fixed: 'Fixed',
  offer: 'Offer',
  'price-on-request': 'Price on request',
  dynamic: 'Dynamic / external',
};

export const catalogueStatusLabel: Record<CatalogueStatus, string> = {
  active: 'Active',
  draft: 'Draft',
  archived: 'Archived',
};

export const catalogueItemStatusLabel: Record<CatalogueItemStatus, string> = {
  active: 'Active',
  hidden: 'Hidden',
  draft: 'Draft',
  archived: 'Archived',
};

export const catalogueItemStatusTone: Record<CatalogueItemStatus, BadgeTone> = {
  active: 'success',
  hidden: 'neutral',
  draft: 'warning',
  archived: 'neutral',
};

export const selectionStatusLabel: Record<SelectionStatus, string> = {
  draft: 'Draft',
  shared: 'Shared',
  'customer-reviewing': 'Customer reviewing',
  revised: 'Revised',
  confirmed: 'Confirmed',
  converted: 'Converted to order',
  'closed-lost': 'Closed / lost',
  abandoned: 'Abandoned',
};

export const selectionStatusTone: Record<SelectionStatus, BadgeTone> = {
  draft: 'neutral',
  shared: 'info',
  'customer-reviewing': 'info',
  revised: 'warning',
  confirmed: 'success',
  converted: 'success',
  'closed-lost': 'neutral',
  abandoned: 'neutral',
};

export const orderStatusLabel: Record<OrderStatus, string> = {
  draft: 'Draft',
  'pending-confirmation': 'Pending customer confirmation',
  'pending-sync': 'Pending sync',
  confirmed: 'Confirmed',
  processing: 'Processing',
  packed: 'Packed',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
  'reconciliation-required': 'Reconciliation required',
};

export const orderStatusTone: Record<OrderStatus, BadgeTone> = {
  draft: 'neutral',
  'pending-confirmation': 'warning',
  'pending-sync': 'warning',
  confirmed: 'info',
  processing: 'info',
  packed: 'info',
  dispatched: 'brand',
  delivered: 'success',
  cancelled: 'danger',
  returned: 'neutral',
  'reconciliation-required': 'danger',
};

export const orderSyncStatusLabel: Record<OrderSyncStatus, string> = {
  'not-applicable': 'CRM-owned',
  synced: 'Synced',
  'pending-sync': 'Pending sync',
  'reconciliation-required': 'Reconciliation required',
  error: 'Sync error',
};

export const paymentStatusLabel: Record<PaymentOverallStatus, string> = {
  'not-requested': 'Not requested',
  pending: 'Pending',
  success: 'Paid',
  failed: 'Failed',
  expired: 'Expired',
  partial: 'Partially paid',
  refunded: 'Refunded',
  'partially-refunded': 'Partially refunded',
};

export const paymentStatusTone: Record<PaymentOverallStatus, BadgeTone> = {
  'not-requested': 'neutral',
  pending: 'warning',
  success: 'success',
  failed: 'danger',
  expired: 'neutral',
  partial: 'warning',
  refunded: 'info',
  'partially-refunded': 'info',
};

export const fulfilmentStatusLabel: Record<FulfilmentStatus, string> = {
  'not-started': 'Not started',
  processing: 'Processing',
  packed: 'Packed',
  dispatched: 'Dispatched',
  'ready-for-pickup': 'Ready for pickup',
  delivered: 'Delivered',
  delayed: 'Delayed',
  failed: 'Failed',
  rto: 'Return to origin',
};

export const fulfilmentStatusTone: Record<FulfilmentStatus, BadgeTone> = {
  'not-started': 'neutral',
  processing: 'info',
  packed: 'info',
  dispatched: 'brand',
  'ready-for-pickup': 'info',
  delivered: 'success',
  delayed: 'warning',
  failed: 'danger',
  rto: 'danger',
};

export const returnStatusLabel: Record<ReturnStatus, string> = {
  requested: 'Requested',
  approved: 'Approved',
  rejected: 'Rejected',
  'collection-scheduled': 'Collection scheduled',
  collected: 'Collected',
  received: 'Received',
  'received-mismatch': 'Received — mismatch',
  'replacement-shipped': 'Replacement shipped',
  refunded: 'Refunded',
  closed: 'Closed',
};

export const returnStatusTone: Record<ReturnStatus, BadgeTone> = {
  requested: 'warning',
  approved: 'info',
  rejected: 'danger',
  'collection-scheduled': 'info',
  collected: 'info',
  received: 'info',
  'received-mismatch': 'warning',
  'replacement-shipped': 'brand',
  refunded: 'success',
  closed: 'neutral',
};

export const refundStatusLabel: Record<RefundStatus, string> = {
  'no-refundable-balance': 'No refundable balance',
  pending: 'Pending',
  processing: 'Processing',
  success: 'Refunded',
  failed: 'Failed',
  'manual-confirmation-required': 'Manual confirmation required',
  'unsupported-by-connector': 'Not supported by connector',
};

export const refundStatusTone: Record<RefundStatus, BadgeTone> = {
  'no-refundable-balance': 'neutral',
  pending: 'warning',
  processing: 'info',
  success: 'success',
  failed: 'danger',
  'manual-confirmation-required': 'warning',
  'unsupported-by-connector': 'neutral',
};

export const mediaMatchStatusLabel: Record<MediaMatchStatus, string> = {
  matched: 'Matched',
  'multiple-matches': 'Multiple matches',
  unmatched: 'Unmatched',
  conflicting: 'Conflicting identifier',
};

export const orderSourceLabel: Record<OrderSource, string> = {
  'crm-request': 'CRM order request',
  'external-sync': 'Synced external order',
  'crm-managed-checkout': 'CRM-managed checkout',
};

export const returnTypeLabel: Record<ReturnType, string> = {
  return: 'Return',
  replacement: 'Replacement',
  'refund-only': 'Refund only',
};

export const approvalTypeLabel: Record<ApprovalType, string> = {
  discount: 'Discount',
  cancel: 'Cancellation',
  refund: 'Refund',
  'price-override': 'Price override',
};

export const approvalStatusLabel: Record<ApprovalStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const approvalStatusTone: Record<ApprovalStatus, BadgeTone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  withdrawn: 'neutral',
};
