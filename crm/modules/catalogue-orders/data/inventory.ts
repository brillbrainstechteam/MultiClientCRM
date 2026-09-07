import type { InventoryAuditEntry, InventoryPosition } from '../domain/types';

/**
 * Inventory fixtures (Requirement §H). Deliberately covers pcs-only,
 * gm-only, and pcs+gm positions across integrated / spreadsheet / CRM-managed
 * sources, plus a stale spreadsheet source and a made-to-order zero-stock row.
 */
export const inventoryPositions: InventoryPosition[] = [
  // cat_aurum_festive — integrated, pcs + gm
  { itemId: 'it_rg_1042', variantId: null, branchId: 'branch_delhi', primaryUnit: 'PCS', primaryQuantity: 6, secondaryUnit: 'GM', secondaryQuantity: 28.8, source: 'integrated', updatedAt: '2026-08-11T07:30:00+05:30', stale: false, madeToOrder: false },
  { itemId: 'it_rg_1042', variantId: null, branchId: 'branch_mumbai', primaryUnit: 'PCS', primaryQuantity: 2, secondaryUnit: 'GM', secondaryQuantity: 9.6, source: 'integrated', updatedAt: '2026-08-11T07:30:00+05:30', stale: false, madeToOrder: false },
  { itemId: 'it_nk_201', variantId: null, branchId: 'branch_delhi', primaryUnit: 'PCS', primaryQuantity: 3, secondaryUnit: 'GM', secondaryQuantity: 67.2, source: 'integrated', updatedAt: '2026-08-11T07:30:00+05:30', stale: false, madeToOrder: false },
  { itemId: 'it_nk_305', variantId: null, branchId: 'branch_delhi', primaryUnit: 'PCS', primaryQuantity: 0, secondaryUnit: 'GM', secondaryQuantity: null, source: 'integrated', updatedAt: '2026-08-11T07:30:00+05:30', stale: false, madeToOrder: true },
  { itemId: 'it_bn_110', variantId: null, branchId: 'branch_delhi', primaryUnit: 'PCS', primaryQuantity: 10, secondaryUnit: 'GM', secondaryQuantity: 96, source: 'integrated', updatedAt: '2026-08-11T07:30:00+05:30', stale: false, madeToOrder: false },
  { itemId: 'it_bn_110', variantId: null, branchId: 'branch_mumbai', primaryUnit: 'PCS', primaryQuantity: 4, secondaryUnit: 'GM', secondaryQuantity: 38.4, source: 'integrated', updatedAt: '2026-08-11T07:30:00+05:30', stale: false, madeToOrder: false },
  { itemId: 'it_rg_2050', variantId: null, branchId: 'branch_delhi', primaryUnit: 'PCS', primaryQuantity: 5, secondaryUnit: 'GM', secondaryQuantity: 19.5, source: 'integrated', updatedAt: '2026-08-11T07:30:00+05:30', stale: false, madeToOrder: false },
  // gm-only bullion — no pieces measure at all
  { itemId: 'it_gc_500', variantId: null, branchId: 'branch_delhi', primaryUnit: 'GM', primaryQuantity: 120, secondaryUnit: null, secondaryQuantity: null, source: 'integrated', updatedAt: '2026-08-11T07:30:00+05:30', stale: false, madeToOrder: false },

  // cat_aurum_lightweight — spreadsheet source, stale
  { itemId: 'it_rg_777', variantId: null, branchId: 'branch_delhi', primaryUnit: 'PCS', primaryQuantity: 8, secondaryUnit: 'GM', secondaryQuantity: 25.6, source: 'spreadsheet', updatedAt: '2026-08-02T11:15:00+05:30', stale: true, madeToOrder: false },
  { itemId: 'it_er_410', variantId: null, branchId: 'branch_delhi', primaryUnit: 'PCS', primaryQuantity: 0, secondaryUnit: 'GM', secondaryQuantity: 0, source: 'spreadsheet', updatedAt: '2026-08-02T11:15:00+05:30', stale: true, madeToOrder: false },
  { itemId: 'it_pd_220', variantId: null, branchId: 'branch_delhi', primaryUnit: 'PCS', primaryQuantity: 15, secondaryUnit: 'GM', secondaryQuantity: 39, source: 'spreadsheet', updatedAt: '2026-08-02T11:15:00+05:30', stale: true, madeToOrder: false },

  // cat_home_decor — CRM-managed, pcs-only
  { itemId: 'it_va_cer_tall', variantId: null, branchId: 'branch_mumbai', primaryUnit: 'PCS', primaryQuantity: 14, secondaryUnit: null, secondaryQuantity: null, source: 'crm-managed', updatedAt: '2026-08-10T15:20:00+05:30', stale: false, madeToOrder: false },
  { itemId: 'it_va_cer_tall', variantId: null, branchId: 'branch_bengaluru', primaryUnit: 'PCS', primaryQuantity: 9, secondaryUnit: null, secondaryQuantity: null, source: 'crm-managed', updatedAt: '2026-08-10T15:20:00+05:30', stale: false, madeToOrder: false },
  { itemId: 'it_wa_canvas_trp', variantId: null, branchId: 'branch_mumbai', primaryUnit: 'PCS', primaryQuantity: 3, secondaryUnit: null, secondaryQuantity: null, source: 'crm-managed', updatedAt: '2026-08-10T15:20:00+05:30', stale: false, madeToOrder: false },
  { itemId: 'it_tw_stone_set', variantId: null, branchId: 'branch_mumbai', primaryUnit: 'PCS', primaryQuantity: 0, secondaryUnit: null, secondaryQuantity: null, source: 'crm-managed', updatedAt: '2026-08-09T09:00:00+05:30', stale: false, madeToOrder: false },
  { itemId: 'it_tw_stone_set', variantId: null, branchId: 'branch_bengaluru', primaryUnit: 'PCS', primaryQuantity: 0, secondaryUnit: null, secondaryQuantity: null, source: 'crm-managed', updatedAt: '2026-08-09T09:00:00+05:30', stale: false, madeToOrder: false },
  { itemId: 'it_lt_lamp_br', variantId: null, branchId: 'branch_mumbai', primaryUnit: 'PCS', primaryQuantity: 6, secondaryUnit: null, secondaryQuantity: null, source: 'crm-managed', updatedAt: '2026-08-10T15:20:00+05:30', stale: false, madeToOrder: false },
  { itemId: 'it_lt_lamp_br', variantId: null, branchId: 'branch_bengaluru', primaryUnit: 'PCS', primaryQuantity: 4, secondaryUnit: null, secondaryQuantity: null, source: 'crm-managed', updatedAt: '2026-08-10T15:20:00+05:30', stale: false, madeToOrder: false },

  // cat_northline_apparel — Shopify-integrated, per-variant, pcs-only, read-only
  { itemId: 'it_ap_ank_ind', variantId: 'var_ank_ind_s', branchId: 'branch_delhi', primaryUnit: 'PCS', primaryQuantity: 12, secondaryUnit: null, secondaryQuantity: null, source: 'integrated', updatedAt: '2026-08-11T09:05:00+05:30', stale: false, madeToOrder: false },
  { itemId: 'it_ap_ank_ind', variantId: 'var_ank_ind_m', branchId: 'branch_delhi', primaryUnit: 'PCS', primaryQuantity: 18, secondaryUnit: null, secondaryQuantity: null, source: 'integrated', updatedAt: '2026-08-11T09:05:00+05:30', stale: false, madeToOrder: false },
  { itemId: 'it_ap_ank_ind', variantId: 'var_ank_ind_l', branchId: 'branch_delhi', primaryUnit: 'PCS', primaryQuantity: 0, secondaryUnit: null, secondaryQuantity: null, source: 'integrated', updatedAt: '2026-08-11T09:05:00+05:30', stale: false, madeToOrder: false },
  { itemId: 'it_ap_sar_mrn', variantId: null, branchId: 'branch_delhi', primaryUnit: 'PCS', primaryQuantity: 5, secondaryUnit: null, secondaryQuantity: null, source: 'integrated', updatedAt: '2026-08-11T09:05:00+05:30', stale: false, madeToOrder: false },
  // Shopify polling missed its last window — demonstrates integrated + stale together (read-only, no adjustment allowed even though stale).
  { itemId: 'it_ap_kur_wht', variantId: null, branchId: 'branch_delhi', primaryUnit: 'PCS', primaryQuantity: 20, secondaryUnit: null, secondaryQuantity: null, source: 'integrated', updatedAt: '2026-08-09T09:05:00+05:30', stale: true, madeToOrder: false },
];

export const inventoryAudit: InventoryAuditEntry[] = [
  { id: 'invaud_1', itemId: 'it_va_cer_tall', branchId: 'branch_mumbai', action: 'add', delta: 6, unit: 'PCS', reason: 'New batch received from workshop.', actorId: 'user_vikram', at: '2026-08-05T10:00:00+05:30' },
  { id: 'invaud_2', itemId: 'it_tw_stone_set', branchId: 'branch_mumbai', action: 'reduce', delta: -4, unit: 'PCS', reason: 'Sold out during weekend sale.', actorId: 'user_meera', at: '2026-08-09T09:00:00+05:30' },
  { id: 'invaud_3', itemId: 'it_nk_305', branchId: 'branch_delhi', action: 'mark-made-to-order', delta: null, unit: 'PCS', reason: 'No ready stock — bridal orders made to order only.', actorId: 'user_anita', at: '2026-07-15T12:00:00+05:30' },
  { id: 'invaud_4', itemId: 'it_er_410', branchId: 'branch_delhi', action: 'mark-unavailable', delta: null, unit: 'PCS', reason: 'Design discontinued pending re-stock decision.', actorId: 'user_vikram', at: '2026-08-02T11:15:00+05:30' },
  { id: 'invaud_5', itemId: 'it_wa_canvas_trp', branchId: 'branch_mumbai', action: 'adjust', delta: -1, unit: 'PCS', reason: 'Damaged unit removed from sellable stock.', actorId: 'user_meera', at: '2026-08-08T16:30:00+05:30' },
];

export function inventoryForItem(itemId: string): InventoryPosition[] {
  return inventoryPositions.filter((position) => position.itemId === itemId);
}

export function inventoryForBranch(itemId: string, branchId: string): InventoryPosition[] {
  return inventoryPositions.filter((position) => position.itemId === itemId && position.branchId === branchId);
}
