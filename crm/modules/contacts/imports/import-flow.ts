import type { ImportMethod } from '@crm/mock-data';

/**
 * Step model for the one Import Wizard. The step sequence is method-aware:
 * the Intelligent path swaps field-mapping (S22) for extraction review (S24);
 * every method converges on validation → preview → processing → results.
 */

export type StepId =
  | 'method'
  | 'source'
  | 'mapping'
  | 'extraction'
  | 'validation'
  | 'preview'
  | 'processing'
  | 'results';

export const stepPaths: Record<StepId, string> = {
  method: '/contacts/imports/new/method',
  source: '/contacts/imports/new/source',
  mapping: '/contacts/imports/new/mapping',
  extraction: '/contacts/imports/new/extraction',
  validation: '/contacts/imports/new/validation',
  preview: '/contacts/imports/new/preview',
  processing: '/contacts/imports/new/processing',
  results: '/contacts/imports/new/results',
};

export const stepLabels: Record<StepId, string> = {
  method: 'Method',
  source: 'Source',
  mapping: 'Map fields',
  extraction: 'Extract',
  validation: 'Validate',
  preview: 'Preview',
  processing: 'Import',
  results: 'Done',
};

export const methodLabels: Record<ImportMethod, string> = {
  csv: 'CSV / Excel',
  sheets: 'Google Sheets',
  intelligent: 'Intelligent extraction',
  google: 'Google Contacts',
  mobile: 'Mobile contacts',
  vcf: 'VCF file',
};

/** Ordered steps for a given method (defaults to a mapping-based flow). */
export function sequenceFor(method: ImportMethod | null): StepId[] {
  const third: StepId = method === 'intelligent' ? 'extraction' : 'mapping';
  return ['method', 'source', third, 'validation', 'preview', 'processing', 'results'];
}

/** Derive the current StepId from a wizard pathname. */
export function stepFromPath(pathname: string): StepId {
  const last = pathname.split('/').pop() ?? 'method';
  return (Object.keys(stepPaths) as StepId[]).find((id) => id === last) ?? 'method';
}
