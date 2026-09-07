/**
 * Canonical Catalogue & Orders screen manifest (SKILL.md §5 required screens
 * + §6 route adapter). This is the audit source of truth for the coverage
 * file and Figma capture manifest — not a 1:1 react-router route table
 * (drawers/modals/panels are query-state on their host route).
 */

export type CommerceSurface = 'page' | 'modal' | 'drawer' | 'panel' | 'state';

export interface CommerceScreen {
  id: string;
  route: string;
  title: string;
  surface: CommerceSurface;
  purpose: string;
  batch: number;
}

export const commerceScreens: CommerceScreen[] = [
  { id: 'ECO-S01', route: '/catalogue-orders/overview', title: 'Commerce Overview', surface: 'page', purpose: 'Operational action centre.', batch: 10 },
  { id: 'ECO-S02', route: '/catalogue-orders/catalogues', title: 'Catalogue List', surface: 'page', purpose: 'View/create/connect/import catalogues.', batch: 2 },
  { id: 'ECO-S03', route: '/catalogue-orders/catalogues/:catalogueId/explorer', title: 'Catalogue Explorer', surface: 'page', purpose: 'Navigate configurable hierarchy.', batch: 2 },
  { id: 'ECO-S04', route: '/catalogue-orders/catalogues/:catalogueId/items/:itemId', title: 'Catalogue Item / Design Detail', surface: 'page', purpose: 'Customer-facing + source/inventory/media detail.', batch: 2 },
  { id: 'ECO-S05', route: '/catalogue-orders/catalogues/new', title: 'Create/Edit Catalogue', surface: 'page', purpose: 'Catalogue metadata and source mode.', batch: 2 },
  { id: 'ECO-S06', route: '/catalogue-orders/catalogues/:catalogueId/schema', title: 'Hierarchy & Attribute Setup', surface: 'page', purpose: 'Configure levels, fields and units.', batch: 2 },
  { id: 'ECO-S07', route: '/catalogue-orders/catalogues/:catalogueId/import?step=upload', title: 'Catalogue Import — Upload', surface: 'page', purpose: 'File/template/source upload.', batch: 3 },
  { id: 'ECO-S08', route: '/catalogue-orders/catalogues/:catalogueId/import?step=map', title: 'Catalogue Import — Mapping', surface: 'page', purpose: 'Hierarchy/item/inventory mapping.', batch: 3 },
  { id: 'ECO-S09', route: '/catalogue-orders/catalogues/:catalogueId/import?step=validate', title: 'Catalogue Import — Validate', surface: 'page', purpose: 'Errors/warnings/conflicts.', batch: 3 },
  { id: 'ECO-S10', route: '/catalogue-orders/catalogues/:catalogueId/import?step=result', title: 'Catalogue Import — Results', surface: 'page', purpose: 'Full/partial outcome.', batch: 3 },
  { id: 'ECO-S11', route: '/catalogue-orders/catalogues/:catalogueId/media', title: 'Media Manager', surface: 'page', purpose: 'Add/manage item images/videos.', batch: 4 },
  { id: 'ECO-S12', route: '/catalogue-orders/catalogues/:catalogueId/media/bulk-match', title: 'Bulk Media Match', surface: 'page', purpose: 'Match bulk files to item IDs.', batch: 4 },
  { id: 'ECO-S13', route: '/catalogue-orders/inventory', title: 'Inventory & Availability', surface: 'page', purpose: 'Branch/item inventory view.', batch: 5 },
  { id: 'ECO-S14', route: '/catalogue-orders/inventory?drawer=update&itemId=<id>', title: 'Inventory Update', surface: 'drawer', purpose: 'CRM/file inventory update.', batch: 5 },
  { id: 'ECO-S15', route: '/catalogue-orders/selections', title: 'Saved Selections / Carts List', surface: 'page', purpose: 'Manage B2B selections and B2C carts.', batch: 7 },
  { id: 'ECO-S16', route: '/catalogue-orders/selections/:selectionId', title: 'Selection / Cart Builder', surface: 'page', purpose: 'Customer-specific item shortlist/cart.', batch: 7 },
  { id: 'ECO-S17', route: '/catalogue-orders/picker', title: 'Catalogue Picker', surface: 'page', purpose: 'Reusable cross-module selector.', batch: 6 },
  { id: 'ECO-S18', route: '/catalogue-orders/share', title: 'Share Preview / Composer', surface: 'page', purpose: 'Validate and route sharing.', batch: 6 },
  { id: 'ECO-S19', route: '/catalogue-orders/orders', title: 'Order Requests & Orders', surface: 'page', purpose: 'Combined operational list.', batch: 8 },
  { id: 'ECO-S20', route: '/catalogue-orders/orders/:orderId', title: 'Order Detail', surface: 'page', purpose: 'Synced commerce 360.', batch: 8 },
  { id: 'ECO-S21', route: '/catalogue-orders/orders/new', title: 'Create Order Request', surface: 'page', purpose: 'B2B/connector-aware request.', batch: 8 },
  { id: 'ECO-S22', route: '/catalogue-orders/orders/:orderId?drawer=payment', title: 'Payment / Commercial Status', surface: 'drawer', purpose: 'Payment request/status drawer.', batch: 9 },
  { id: 'ECO-S23', route: '/catalogue-orders/orders/:orderId?drawer=fulfilment', title: 'Delivery / Fulfilment Exception', surface: 'drawer', purpose: 'Exception action/handoff.', batch: 9 },
  { id: 'ECO-S24', route: '/catalogue-orders/returns', title: 'Returns & Exceptions List', surface: 'page', purpose: 'Customer service queue.', batch: 9 },
  { id: 'ECO-S25', route: '/catalogue-orders/returns/:returnId', title: 'Return / Replacement Detail', surface: 'page', purpose: 'Capture/track resolution.', batch: 9 },
  { id: 'ECO-S26', route: '/catalogue-orders/sync', title: 'Sync & Audit History', surface: 'page', purpose: 'Source events, retries, audit.', batch: 10 },
  { id: 'ECO-S27', route: '/catalogue-orders/orders/:orderId?drawer=approval', title: 'Approval / Controlled Action', surface: 'drawer', purpose: 'Discount/cancel/refund/override request.', batch: 9 },

  { id: 'ECO-C01', route: '/settings/commerce', title: 'Commerce Setup Hub', surface: 'state', purpose: 'Settings-owned — deep-linked from Overview alerts.', batch: 10 },
  { id: 'ECO-C02', route: '/settings/commerce/connectors', title: 'Connector Setup', surface: 'state', purpose: 'Settings-owned.', batch: 10 },
  { id: 'ECO-C03', route: '/settings/commerce/mapping', title: 'Source Mapping & Field Ownership', surface: 'state', purpose: 'Settings-owned.', batch: 10 },
  { id: 'ECO-C04', route: '/settings/commerce/schema', title: 'Catalogue Schema / Units / Policies', surface: 'state', purpose: 'Settings-owned.', batch: 10 },
  { id: 'ECO-C05', route: '/settings/commerce/lifecycle', title: 'Order / Payment / Fulfilment Lifecycle Rules', surface: 'state', purpose: 'Settings-owned.', batch: 10 },

  { id: 'ECO-P01', route: '/automation?entity=commerce-selection', title: 'Abandoned Cart / Selection Follow-up', surface: 'state', purpose: 'Automation-owned handoff.', batch: 11 },
  { id: 'ECO-P02', route: '/ai-agents?entity=commerce-recommendation', title: 'Product Recommendations', surface: 'state', purpose: 'AI Assistance-owned handoff.', batch: 11 },
  { id: 'ECO-P03', route: '/reports?entity=commerce', title: 'Commerce Analytics', surface: 'state', purpose: 'Reports-owned handoff.', batch: 11 },
];

export function findCommerceScreen(id: string): CommerceScreen | undefined {
  return commerceScreens.find((screen) => screen.id === id);
}

export const coreCommerceScreens = commerceScreens.filter((screen) => screen.id.startsWith('ECO-S'));
