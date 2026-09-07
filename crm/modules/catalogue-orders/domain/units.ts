import type { Unit } from './types';

export const unitLabel: Record<Unit, string> = {
  PCS: 'pcs',
  GM: 'gm',
  KG: 'kg',
  PAIR: 'pair',
  SET: 'set',
  BOX: 'box',
  METER: 'm',
  CUSTOM: 'unit',
};

export const unitOptions: { value: Unit; label: string }[] = (
  Object.keys(unitLabel) as Unit[]
).map((value) => ({ value, label: unitLabel[value] }));

/** `6 pcs`, `38.6 gm` — never mixes primary/secondary into one number. */
export function formatQuantity(quantity: number, unit: Unit): string {
  const rounded = Number.isInteger(quantity) ? quantity : Number(quantity.toFixed(2));
  return `${rounded} ${unitLabel[unit]}`;
}

/** Combines primary + optional secondary measure, e.g. `6 pcs · 38.6 gm`. */
export function formatDualQuantity(
  primaryQuantity: number,
  primaryUnit: Unit,
  secondaryQuantity: number | null,
  secondaryUnit: Unit | null,
): string {
  const primary = formatQuantity(primaryQuantity, primaryUnit);
  if (secondaryQuantity === null || secondaryUnit === null) return primary;
  return `${primary} · ${formatQuantity(secondaryQuantity, secondaryUnit)}`;
}
