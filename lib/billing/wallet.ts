import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import type { Wallet, WalletLedger } from '@prisma/client';

/**
 * Wallet + append-only ledger (Rule 12: never overwrite financial history;
 * Rules 7/8: idempotent debit/credit).
 *
 * Every balance change goes through applyLedger, which is atomic (transaction)
 * and idempotent (idempotencyKey unique). Duplicate webhook callbacks and
 * duplicate Meta message events therefore never double-charge or double-credit.
 */

export type LedgerType = 'recharge' | 'message_debit' | 'adjustment' | 'refund' | 'correction';

export interface LedgerInput {
  tenantId: string;
  type: LedgerType;
  amount: Prisma.Decimal.Value; // signed: +credit / -debit
  description: string;
  refType?: string;
  refId?: string;
  idempotencyKey?: string;
  createdByUserId?: string;
}

export interface LedgerResult {
  ledger: WalletLedger;
  wallet?: Wallet;
  duplicate: boolean;
}

export async function getOrCreateWallet(tenantId: string): Promise<Wallet> {
  return prisma.wallet.upsert({ where: { tenantId }, update: {}, create: { tenantId } });
}

/**
 * Apply a signed amount to the wallet and record a ledger entry, atomically.
 * If idempotencyKey was already used, returns that existing entry (duplicate:true)
 * and does NOT change the balance.
 */
export async function applyLedger(input: LedgerInput): Promise<LedgerResult> {
  const amount = new Prisma.Decimal(input.amount);
  try {
    return await prisma.$transaction(async (tx) => {
      if (input.idempotencyKey) {
        const existing = await tx.walletLedger.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
        if (existing) return { ledger: existing, duplicate: true };
      }
      const wallet = await tx.wallet.upsert({ where: { tenantId: input.tenantId }, update: {}, create: { tenantId: input.tenantId } });
      const balanceAfter = new Prisma.Decimal(wallet.balance).plus(amount);
      const updated = await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
      const ledger = await tx.walletLedger.create({
        data: {
          tenantId: input.tenantId,
          walletId: wallet.id,
          type: input.type,
          amount,
          balanceAfter,
          description: input.description,
          refType: input.refType,
          refId: input.refId,
          idempotencyKey: input.idempotencyKey,
          createdByUserId: input.createdByUserId,
        },
      });
      return { ledger, wallet: updated, duplicate: false };
    });
  } catch (e) {
    // Concurrent call won the idempotencyKey race — treat as duplicate.
    if (input.idempotencyKey && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const existing = await prisma.walletLedger.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (existing) return { ledger: existing, duplicate: true };
    }
    throw e;
  }
}

/** Convenience: credit (recharge/refund/adjustment). Amount must be positive. */
export function creditWallet(input: Omit<LedgerInput, 'amount'> & { amount: Prisma.Decimal.Value }): Promise<LedgerResult> {
  return applyLedger({ ...input, amount: new Prisma.Decimal(input.amount).abs() });
}

/** Convenience: debit (message/adjustment). Pass a positive amount; stored negative. */
export function debitWallet(input: Omit<LedgerInput, 'amount'> & { amount: Prisma.Decimal.Value }): Promise<LedgerResult> {
  return applyLedger({ ...input, amount: new Prisma.Decimal(input.amount).abs().negated() });
}

/** True when wallet billing is active for this tenant (not direct-to-Meta). */
export async function isWalletMode(tenantId: string): Promise<boolean> {
  const w = await getOrCreateWallet(tenantId);
  return w.billingMode === 'wallet';
}

/** Is balance at/below the tenant's low-balance threshold (if set)? */
export function isLowBalance(wallet: Wallet): boolean {
  if (!wallet.lowBalanceThreshold) return false;
  return new Prisma.Decimal(wallet.balance).lte(wallet.lowBalanceThreshold);
}
