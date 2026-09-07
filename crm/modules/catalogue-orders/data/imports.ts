import type { CatalogueImportJob } from '../domain/types';

/** Import job history (Requirement §J5/J6) — includes a full success and a partial-success run. */
export const importJobs: CatalogueImportJob[] = [
  {
    id: 'import_lightweight_aug02',
    catalogueId: 'cat_aurum_lightweight',
    fileName: 'lightweight-showroom-aug.xlsx',
    updateMode: 'create-and-update',
    status: 'partial-success',
    columnMapping: {
      'Metal': 'metal',
      'Category': 'productType',
      'Weight Band': 'weightRange',
      'Design No': 'design',
      'Gross Wt (gm)': 'grossWeightGm',
      'SKU': 'sku',
    },
    totalRows: 5,
    counts: { created: 2, updated: 1, skipped: 1, failed: 1 },
    rowResults: [
      { row: 2, identifier: 'RG-777', status: 'created', message: null },
      { row: 3, identifier: 'ER-410', status: 'created', message: null },
      { row: 4, identifier: 'PD-220', status: 'updated', message: 'Gross weight changed 2.4gm → 2.6gm.' },
      { row: 5, identifier: 'PD-220', status: 'skipped', message: 'Duplicate design code within the same file — kept first occurrence.' },
      { row: 6, identifier: 'BR-990', status: 'failed', message: 'Invalid unit "tola" in Gross Wt (gm) column — expected grams.' },
    ],
    startedByUserId: 'user_vikram',
    startedAt: '2026-08-02T11:10:00+05:30',
    completedAt: '2026-08-02T11:15:00+05:30',
  },
  {
    id: 'import_lightweight_jun10',
    catalogueId: 'cat_aurum_lightweight',
    fileName: 'lightweight-showroom-initial.xlsx',
    updateMode: 'create-only',
    status: 'completed',
    columnMapping: {
      'Metal': 'metal',
      'Category': 'productType',
      'Weight Band': 'weightRange',
      'Design No': 'design',
      'Gross Wt (gm)': 'grossWeightGm',
      'SKU': 'sku',
    },
    totalRows: 3,
    counts: { created: 3, updated: 0, skipped: 0, failed: 0 },
    rowResults: [
      { row: 2, identifier: 'RG-777', status: 'created', message: null },
      { row: 3, identifier: 'ER-410', status: 'created', message: null },
      { row: 4, identifier: 'PD-220', status: 'created', message: null },
    ],
    startedByUserId: 'user_vikram',
    startedAt: '2026-06-10T09:25:00+05:30',
    completedAt: '2026-06-10T09:30:00+05:30',
  },
];

export function importJobsForCatalogue(catalogueId: string): CatalogueImportJob[] {
  return importJobs
    .filter((job) => job.catalogueId === catalogueId)
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
}

export function findImportJob(id: string): CatalogueImportJob | undefined {
  return importJobs.find((job) => job.id === id);
}
