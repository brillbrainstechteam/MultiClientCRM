import type { Collection } from '../domain/types';

export const collections: Collection[] = [
  { id: 'col_festive_2026', catalogueId: 'cat_aurum_festive', name: 'Festive 2026', description: 'Curated designs for the festive season.', itemIds: ['it_rg_1042', 'it_nk_201', 'it_bn_110', 'it_gc_500'], visibility: 'customer-visible', lastSharedAt: '2026-08-09T18:00:00+05:30' },
  { id: 'col_wedding_2026', catalogueId: 'cat_aurum_festive', name: 'Wedding 2026', description: 'Bridal and wedding-occasion heavy pieces.', itemIds: ['it_nk_305'], visibility: 'customer-visible', lastSharedAt: '2026-08-05T14:00:00+05:30' },
  { id: 'col_diamond_edit', catalogueId: 'cat_aurum_festive', name: 'Diamond Edit', description: 'Diamond-studded pieces with limited-time offers.', itemIds: ['it_rg_2050'], visibility: 'customer-visible', lastSharedAt: null },
  { id: 'col_lightweight_festive', catalogueId: 'cat_aurum_festive', name: 'Lightweight', description: 'Under-10gm daily-wear pieces.', itemIds: ['it_bn_110'], visibility: 'customer-visible', lastSharedAt: null },
  { id: 'col_lightweight_uploaded', catalogueId: 'cat_aurum_lightweight', name: 'Lightweight', description: 'Full lightweight showroom line.', itemIds: ['it_rg_777', 'it_er_410', 'it_pd_220'], visibility: 'customer-visible', lastSharedAt: '2026-07-28T11:00:00+05:30' },
  { id: 'col_monsoon_decor', catalogueId: 'cat_home_decor', name: 'Monsoon Edit', description: 'Seasonal home styling picks.', itemIds: ['it_va_cer_tall', 'it_wa_canvas_trp'], visibility: 'customer-visible', lastSharedAt: '2026-08-06T10:00:00+05:30' },
  { id: 'col_new_arrivals_decor', catalogueId: 'cat_home_decor', name: 'New Arrivals', description: 'Latest additions to the décor line.', itemIds: ['it_tw_stone_set', 'it_lt_lamp_br'], visibility: 'customer-visible', lastSharedAt: null },
  { id: 'col_monsoon_apparel', catalogueId: 'cat_northline_apparel', name: 'Monsoon Edit', description: 'Monsoon-ready fabrics and colours.', itemIds: ['it_ap_ank_ind'], visibility: 'customer-visible', lastSharedAt: '2026-08-07T09:00:00+05:30' },
  { id: 'col_new_arrivals_apparel', catalogueId: 'cat_northline_apparel', name: 'New Arrivals', description: 'This week\'s new listings.', itemIds: ['it_ap_sar_mrn', 'it_ap_kur_wht'], visibility: 'customer-visible', lastSharedAt: null },
];

export function collectionsForCatalogue(catalogueId: string): Collection[] {
  return collections.filter((collection) => collection.catalogueId === catalogueId);
}

export function findCollection(id: string): Collection | undefined {
  return collections.find((collection) => collection.id === id);
}
