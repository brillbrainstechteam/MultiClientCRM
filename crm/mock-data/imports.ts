import type { ImportJob } from './types';

/** Import history fixtures for the Imports & Sync hub (CON-S07/S08). */
export const importJobs: ImportJob[] = [
  {
    id: 'import_csv_20260809',
    method: 'csv',
    fileName: 'delhi-walkins-aug.csv',
    status: 'completed',
    startedByUserId: 'user_meera',
    branchId: 'branch_delhi',
    sourceTag: 'Walk-in register',
    duplicatePolicy: 'skip',
    createdAt: '2026-08-09T11:20:00+05:30',
    counts: { added: 214, updated: 12, skipped: 31, rejected: 4, total: 261 },
    zoneExceptions: 24,
  },
  {
    id: 'import_sheets_20260808',
    method: 'sheets',
    fileName: 'Trade Expo Leads (Google Sheets)',
    status: 'completed',
    startedByUserId: 'user_karan',
    branchId: 'branch_mumbai',
    sourceTag: 'Trade Expo — West',
    duplicatePolicy: 'update',
    createdAt: '2026-08-08T17:35:00+05:30',
    counts: { added: 96, updated: 8, skipped: 5, rejected: 1, total: 110 },
    zoneExceptions: 6,
  },
  {
    id: 'import_intelligent_20260806',
    method: 'intelligent',
    fileName: 'business-cards-batch.pdf',
    status: 'partial-success',
    startedByUserId: 'user_vikram',
    branchId: 'branch_mumbai',
    sourceTag: 'Trade show — Mumbai',
    duplicatePolicy: 'update',
    createdAt: '2026-08-06T15:05:00+05:30',
    counts: { added: 38, updated: 5, skipped: 2, rejected: 9, total: 54 },
  },
  {
    id: 'import_google_20260801',
    method: 'google',
    fileName: null,
    status: 'failed',
    startedByUserId: 'user_anita',
    branchId: 'branch_delhi',
    sourceTag: 'Google Contacts sync',
    duplicatePolicy: 'update',
    createdAt: '2026-08-01T08:40:00+05:30',
    counts: { added: 0, updated: 0, skipped: 0, rejected: 0, total: 0 },
  },
];

export function findImportJob(jobId: string): ImportJob | undefined {
  return importJobs.find((job) => job.id === jobId);
}
