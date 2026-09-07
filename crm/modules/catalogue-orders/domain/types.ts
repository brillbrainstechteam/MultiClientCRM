/**
 * Catalogue & Orders domain model (Revised Final Requirement §7 "Core domain
 * model", plus sections D/E/F/G/H/I/L/X/Y/Z/AA/AB).
 *
 * Non-negotiable invariants encoded here (SKILL.md §3):
 *  - Hierarchy is data-driven per catalogue (`HierarchyLevel[]`), never a
 *    fixed Collection→Product→Variant shape.
 *  - Hierarchy (navigation/grouping) and attributes (description) are
 *    separate structures — `CatalogueItem.hierarchyPath` vs `.attributes`.
 *  - Every catalogue declares a `sourceMode`; every field on an item can be
 *    independently CRM- or source-owned (`FieldOwnershipMap`).
 *  - Inventory carries a configurable primary unit and an optional secondary
 *    measure (pieces + grams is a first-class case, not a special case).
 *  - `Order` unifies CRM order requests and synchronized external orders —
 *    `source` + `syncStatus` say which, capability flags say what the UI may
 *    edit versus must route to "Open in source".
 */

import type { Branch, RoleKey } from '@crm/mock-data';

/* ---------------------------------------------------------------------- */
/* Units (Requirement §H)                                                  */
/* ---------------------------------------------------------------------- */

export type Unit = 'PCS' | 'GM' | 'KG' | 'PAIR' | 'SET' | 'BOX' | 'METER' | 'CUSTOM';

/* ---------------------------------------------------------------------- */
/* Source modes and field ownership (Requirement §D)                       */
/* ---------------------------------------------------------------------- */

export type SourceMode = 'integrated' | 'uploaded' | 'crm-managed';

export type FieldOwner = 'crm' | 'source';

export interface FieldOwnership {
  owner: FieldOwner;
  /** Owner permits the other side to write this field back (rare; connector-declared). */
  connectorWriteable?: boolean;
  /** True when the owning source's value is older than the catalogue's staleness threshold. */
  stale?: boolean;
}

/** Keyed by attribute/field key (`sku`, `grossWeightGm`, `whatsappCaption`, …). */
export type FieldOwnershipMap = Record<string, FieldOwnership>;

/* ---------------------------------------------------------------------- */
/* Connector architecture (Requirement §X)                                 */
/* ---------------------------------------------------------------------- */

export type ConnectorClass =
  | 'erp'
  | 'accounting-stock'
  | 'shopify'
  | 'woocommerce'
  | 'custom-api'
  | 'file-import'
  | 'manual';

export type ConnectorState =
  | 'connected'
  | 'partial'
  | 'disconnected'
  | 'auth-failed'
  | 'mapping-required'
  | 'stale'
  | 'syncing'
  | 'retry-queued'
  | 'permanent-error';

export type ConnectorCapabilityKey =
  | 'products.read'
  | 'products.write'
  | 'inventory.read'
  | 'inventory.write'
  | 'pricing.read'
  | 'pricing.write'
  | 'customers.read'
  | 'customers.write'
  | 'orders.read'
  | 'orders.create'
  | 'orders.update'
  | 'orders.cancel'
  | 'payments.read'
  | 'paymentLinks.create'
  | 'fulfilment.read'
  | 'fulfilment.update'
  | 'returns.read'
  | 'returns.create'
  | 'refunds.read'
  | 'refunds.initiate'
  | 'media.read'
  | 'webhooks'
  | 'polling'
  | 'fileImport';

export type ConnectorCapabilities = Partial<Record<ConnectorCapabilityKey, boolean>>;

export interface ConnectorCapability {
  id: string;
  name: string;
  class: ConnectorClass;
  state: ConnectorState;
  capabilities: ConnectorCapabilities;
  lastSuccessfulSyncAt: string | null;
  staleAsOfLabel: string | null;
  errorMessage: string | null;
}

/** True when the connector explicitly grants the capability (default false — never assume). */
export function hasCapability(
  connector: ConnectorCapability | undefined,
  key: ConnectorCapabilityKey,
): boolean {
  return Boolean(connector?.capabilities[key]);
}

/* ---------------------------------------------------------------------- */
/* Hierarchy and attribute schema (Requirement §E/F)                       */
/* ---------------------------------------------------------------------- */

export interface HierarchyLevel {
  key: string;
  label: string;
  order: number;
  required: boolean;
  filterable: boolean;
  visibleInExplorer: boolean;
  visibleToCustomer: boolean;
}

export type AttributeDataType =
  | 'text'
  | 'long-text'
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'single-select'
  | 'multi-select'
  | 'date'
  | 'currency'
  | 'quantity'
  | 'weight'
  | 'url'
  | 'media-reference';

export interface CatalogueAttribute {
  id: string;
  key: string;
  name: string;
  dataType: AttributeDataType;
  unit?: Unit;
  options?: string[];
  required: boolean;
  filterable: boolean;
  searchable: boolean;
  customerVisible: boolean;
  shareableOnWhatsapp: boolean;
  inventoryRelated: boolean;
  sourceOwnership: FieldOwner;
  isPreset?: boolean;
}

/* ---------------------------------------------------------------------- */
/* Catalogue (Requirement §7 "Catalogue")                                  */
/* ---------------------------------------------------------------------- */

export type CatalogueStatus = 'active' | 'draft' | 'archived';
export type BusinessMode = 'b2b' | 'b2c' | 'hybrid';

export interface Catalogue {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  businessMode: BusinessMode;
  sourceMode: SourceMode;
  connectorId: string | null;
  sourceStatus: ConnectorState;
  hierarchySchema: HierarchyLevel[];
  attributeSchema: CatalogueAttribute[];
  unitSchema: Unit[];
  branchIds: string[];
  sourceMapping: Record<string, string>;
  lastSync: string | null;
  status: CatalogueStatus;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

/* ---------------------------------------------------------------------- */
/* Media (Requirement §I)                                                  */
/* ---------------------------------------------------------------------- */

export type MediaKind = 'image' | 'video' | 'document';
export type MediaStatus = 'ok' | 'broken' | 'processing';

export interface MediaAsset {
  id: string;
  itemId: string;
  kind: MediaKind;
  url: string;
  fileName: string;
  isCover: boolean;
  order: number;
  caption: string;
  customerVisible: boolean;
  status: MediaStatus;
  source: 'upload' | 'url-import' | 'bulk-match';
}

/* ---------------------------------------------------------------------- */
/* Inventory (Requirement §H)                                              */
/* ---------------------------------------------------------------------- */

export type InventorySourceMode = 'integrated' | 'spreadsheet' | 'crm-managed';

export interface InventoryPosition {
  itemId: string;
  variantId: string | null;
  branchId: string;
  primaryUnit: Unit;
  primaryQuantity: number;
  secondaryUnit: Unit | null;
  secondaryQuantity: number | null;
  source: InventorySourceMode;
  updatedAt: string;
  stale: boolean;
  madeToOrder: boolean;
}

export interface InventoryAuditEntry {
  id: string;
  itemId: string;
  branchId: string;
  action: 'add' | 'reduce' | 'adjust' | 'mark-unavailable' | 'mark-made-to-order' | 'sync';
  delta: number | null;
  unit: Unit;
  reason: string;
  actorId: string | null;
  at: string;
}

/* ---------------------------------------------------------------------- */
/* Catalogue item / design (Requirement §G)                                */
/* ---------------------------------------------------------------------- */

export type PriceMode = 'fixed' | 'offer' | 'price-on-request' | 'dynamic';

export interface Price {
  mode: PriceMode;
  amount: number | null;
  compareAtAmount: number | null;
  currency: string;
}

export interface CatalogueItemVariant {
  id: string;
  label: string;
  attributes: Record<string, string>;
  sku: string;
  available: boolean;
}

export type CatalogueItemStatus = 'active' | 'hidden' | 'draft' | 'archived';

export interface AuditEvent {
  id: string;
  at: string;
  actorId: string | null;
  actorLabel: string;
  action: string;
  detail: string;
  source: 'manual' | 'automated' | 'integration' | 'approval';
}

export interface CatalogueItem {
  id: string;
  catalogueId: string;
  hierarchyPath: string[];
  itemCode: string;
  sku: string;
  externalId: string | null;
  title: string;
  attributes: Record<string, string | number | boolean | string[]>;
  variants: CatalogueItemVariant[];
  price: Price;
  media: MediaAsset[];
  collections: string[];
  tags: string[];
  whatsappCaption: string;
  customerVisible: boolean;
  branchVisibility: string[];
  fieldOwnership: FieldOwnershipMap;
  status: CatalogueItemStatus;
  lastSync: string | null;
  sourceStale: boolean;
  audit: AuditEvent[];
}

/* ---------------------------------------------------------------------- */
/* Collections (Requirement §L1)                                           */
/* ---------------------------------------------------------------------- */

export interface Collection {
  id: string;
  catalogueId: string;
  name: string;
  description: string;
  itemIds: string[];
  visibility: 'internal' | 'customer-visible';
  lastSharedAt: string | null;
}

/* ---------------------------------------------------------------------- */
/* Saved Selections / Carts (Requirement §L2, §Z)                          */
/* ---------------------------------------------------------------------- */

export type SelectionIntent = 'selection' | 'cart';

export type SelectionStatus =
  | 'draft'
  | 'shared'
  | 'customer-reviewing'
  | 'revised'
  | 'confirmed'
  | 'converted'
  | 'closed-lost'
  | 'abandoned';

export interface SelectionLine {
  itemId: string;
  variantId: string | null;
  quantityPieces: number | null;
  quantityWeightGm: number | null;
  priceAtSelection: number | null;
  notes: string;
}

export interface SavedSelection {
  id: string;
  intent: SelectionIntent;
  catalogueId: string;
  contactId: string;
  conversationId: string | null;
  ownerId: string;
  branchId: string;
  eventSource: string;
  items: SelectionLine[];
  requestedPieces: number | null;
  requestedWeightGm: number | null;
  notes: string;
  status: SelectionStatus;
  sharedAt: string | null;
  lastCustomerResponseAt: string | null;
  orderId: string | null;
  createdAt: string;
  updatedAt: string;
  audit: AuditEvent[];
}

/* ---------------------------------------------------------------------- */
/* Orders (Requirement §Y, unifying Order Request + synchronized Order)    */
/* ---------------------------------------------------------------------- */

export type OrderSource = 'crm-request' | 'external-sync' | 'crm-managed-checkout';

export type OrderStatus =
  | 'draft'
  | 'pending-confirmation'
  | 'pending-sync'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'reconciliation-required';

export type OrderSyncStatus = 'not-applicable' | 'synced' | 'pending-sync' | 'reconciliation-required' | 'error';

export interface OrderLine {
  itemId: string;
  variantId: string | null;
  title: string;
  quantityPieces: number | null;
  quantityWeightGm: number | null;
  priceMode: PriceMode;
  unitPrice: number | null;
  lineTotal: number | null;
}

export type PaymentRequestStatus = 'pending' | 'success' | 'failed' | 'expired';

export interface PaymentRequestRecord {
  id: string;
  amount: number;
  currency: string;
  method: string;
  createdAt: string;
  expiresAt: string;
  status: PaymentRequestStatus;
  link: string | null;
}

export type PaymentOverallStatus =
  | 'not-requested'
  | 'pending'
  | 'success'
  | 'failed'
  | 'expired'
  | 'partial'
  | 'refunded'
  | 'partially-refunded';

export interface PaymentState {
  status: PaymentOverallStatus;
  balanceDue: number | null;
  currency: string;
  requests: PaymentRequestRecord[];
}

export type FulfilmentStatus =
  | 'not-started'
  | 'processing'
  | 'packed'
  | 'dispatched'
  | 'ready-for-pickup'
  | 'delivered'
  | 'delayed'
  | 'failed'
  | 'rto';

export interface FulfilmentState {
  status: FulfilmentStatus;
  courier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  expectedDeliveryAt: string | null;
  exceptionReason: string | null;
  exceptionOwnerId: string | null;
}

export interface Order {
  id: string;
  source: OrderSource;
  connectorId: string | null;
  externalOrderId: string | null;
  catalogueId: string;
  contactId: string;
  selectionId: string | null;
  branchId: string;
  ownerId: string;
  status: OrderStatus;
  syncStatus: OrderSyncStatus;
  requestedSnapshot: OrderLine[];
  confirmedSnapshot: OrderLine[] | null;
  commercialSummary: { subtotal: number | null; discount: number; tax: number; total: number | null; currency: string };
  commercialNotes: string;
  payment: PaymentState;
  fulfilment: FulfilmentState;
  returnCaseId: string | null;
  timeline: AuditEvent[];
  createdAt: string;
  updatedAt: string;
}

/* ---------------------------------------------------------------------- */
/* Returns / Replacements / Refunds (Requirement §AB)                      */
/* ---------------------------------------------------------------------- */

export type ReturnType = 'return' | 'replacement' | 'refund-only';

export type ReturnStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'collection-scheduled'
  | 'collected'
  | 'received'
  | 'received-mismatch'
  | 'replacement-shipped'
  | 'refunded'
  | 'closed';

export type RefundMethod = 'gateway' | 'manual';
export type RefundStatus =
  | 'no-refundable-balance'
  | 'pending'
  | 'processing'
  | 'success'
  | 'failed'
  | 'manual-confirmation-required'
  | 'unsupported-by-connector';

export interface ReturnLine {
  itemId: string;
  variantId: string | null;
  quantity: number;
  reason: string;
}

export interface ReturnCase {
  id: string;
  orderId: string;
  contactId: string;
  type: ReturnType;
  items: ReturnLine[];
  reasonNotes: string;
  evidenceUrls: string[];
  eligibility: 'eligible' | 'ineligible' | 'override';
  status: ReturnStatus;
  collectionScheduledAt: string | null;
  replacementOrderId: string | null;
  refundMethod: RefundMethod | null;
  refundAmount: number | null;
  refundStatus: RefundStatus | null;
  ownerId: string;
  timeline: AuditEvent[];
  createdAt: string;
  updatedAt: string;
}

/* ---------------------------------------------------------------------- */
/* Sync & audit (Requirement §X3, §AH)                                     */
/* ---------------------------------------------------------------------- */

export type SyncEntityType = 'catalogue' | 'item' | 'inventory' | 'order' | 'payment' | 'fulfilment' | 'media';
export type SyncDirection = 'inbound' | 'outbound';
export type SyncEventStatus = 'success' | 'error' | 'retrying' | 'conflict';

export interface SyncEvent {
  id: string;
  connectorId: string;
  catalogueId: string | null;
  entityType: SyncEntityType;
  entityId: string | null;
  entityLabel: string;
  direction: SyncDirection;
  status: SyncEventStatus;
  message: string;
  occurredAt: string;
  retryable: boolean;
}

/* ---------------------------------------------------------------------- */
/* Approvals (Requirement §AB2/AB4, ECO-S27)                               */
/* ---------------------------------------------------------------------- */

export type ApprovalType = 'discount' | 'cancel' | 'refund' | 'price-override';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  entityType: 'order' | 'selection' | 'return' | 'item';
  entityId: string;
  entityLabel: string;
  requestedById: string;
  requesterNote: string;
  thresholdLabel: string;
  approverId: string | null;
  status: ApprovalStatus;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
}

/* ---------------------------------------------------------------------- */
/* Import (Requirement §J)                                                 */
/* ---------------------------------------------------------------------- */

export type ImportUpdateMode = 'create-only' | 'update-only' | 'create-and-update' | 'inventory-only' | 'media-url-update';

export type ImportRowStatus = 'created' | 'updated' | 'skipped' | 'failed';

export interface ImportRowResult {
  row: number;
  identifier: string;
  status: ImportRowStatus;
  message: string | null;
}

export type ImportJobStatus = 'uploaded' | 'mapped' | 'validating' | 'validated' | 'importing' | 'completed' | 'partial-success' | 'failed';

export interface CatalogueImportJob {
  id: string;
  catalogueId: string;
  fileName: string;
  updateMode: ImportUpdateMode;
  status: ImportJobStatus;
  columnMapping: Record<string, string>;
  totalRows: number;
  counts: { created: number; updated: number; skipped: number; failed: number };
  rowResults: ImportRowResult[];
  startedByUserId: string;
  startedAt: string;
  completedAt: string | null;
}

/* ---------------------------------------------------------------------- */
/* Bulk media match (Requirement §I3)                                      */
/* ---------------------------------------------------------------------- */

export type MediaMatchStatus = 'matched' | 'multiple-matches' | 'unmatched' | 'conflicting';

export interface MediaMatchCandidate {
  id: string;
  fileName: string;
  kind: MediaKind;
  status: MediaMatchStatus;
  matchedItemIds: string[];
}

/* ---------------------------------------------------------------------- */
/* Capability-based permissions surface (Requirement §AI)                  */
/* ---------------------------------------------------------------------- */

export type CommerceCapability =
  | 'catalogue.view'
  | 'catalogue.create'
  | 'catalogue.configureSchema'
  | 'catalogue.import'
  | 'catalogue.editCrmFields'
  | 'catalogue.editSourceFields'
  | 'catalogue.manageMedia'
  | 'inventory.view'
  | 'inventory.adjust'
  | 'price.view'
  | 'weight.view'
  | 'catalogue.share'
  | 'selection.create'
  | 'selection.assign'
  | 'orderRequest.create'
  | 'order.view'
  | 'order.requestCancel'
  | 'payment.request'
  | 'refund.request'
  | 'approval.approve'
  | 'integration.manage'
  | 'audit.view'
  | 'export.use';

export type { RoleKey, Branch };
