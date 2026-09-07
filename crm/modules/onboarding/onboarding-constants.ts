import type { StepperItem } from '@crm/design-system';

/** The five perceived client stages (SKILL.md "Governing UX principle"). */
export const STAGE_ITEMS: StepperItem[] = [
  { id: 'number', label: 'Your Number' },
  { id: 'strategy', label: 'Best Connection Option' },
  { id: 'meta', label: 'Connect with Meta' },
  { id: 'activate', label: 'Activate & Assign' },
  { id: 'ready', label: 'Ready' },
];

export type GuidedSetupMode = 'first-time' | 'add-number';
