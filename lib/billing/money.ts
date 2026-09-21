import { Prisma } from '@prisma/client';

/**
 * Money helpers. All money in the billing system is Prisma.Decimal (never a JS
 * float — Rule: exact amounts). Rates carry up to 4 dp; displayed amounts 2 dp.
 */
export type Money = Prisma.Decimal;

export const money = (n: Prisma.Decimal.Value): Prisma.Decimal => new Prisma.Decimal(n);
export const ZERO = new Prisma.Decimal(0);

export function toNumber(v: Prisma.Decimal.Value): number {
  return new Prisma.Decimal(v).toNumber();
}

/** "₹4,820.00" — Indian grouping, 2 dp. */
export function formatINR(v: Prisma.Decimal.Value): string {
  return '₹' + new Prisma.Decimal(v).toNumber().toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Rate with up to 4 dp, trailing zeros trimmed: "₹0.7846". */
export function formatRate(v: Prisma.Decimal.Value): string {
  const n = new Prisma.Decimal(v);
  return '₹' + n.toNumber().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}
