import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import type { MessageBillingRecord } from '@prisma/client';
import { marketFromPhone, normalizeCategory, resolveRate } from './rates';
import { debitWallet, getOrCreateWallet } from './wallet';
import { notify } from './notify';

/**
 * Bill a single delivered/sent WhatsApp message (§11, §23, §27).
 *
 * Source of truth is Meta's status webhook `pricing` object: bill only when
 * Meta says billable, using the Meta-recognised category (§31). Idempotent by
 * waMessageId (Rule 7): the same message — across sent/delivered/read events or
 * duplicate callbacks — is charged at most once.
 *
 * Wallet is debited only in `wallet` billing mode; in `direct` mode the record
 * is still written (for usage reporting) with walletDebit = 0.
 */
export interface BillMessageInput {
  tenantId: string;
  waMessageId: string;
  recipient: string;
  category: string;
  billable?: boolean; // from pricing.billable; default true
  wabaId?: string | null;
  phoneNumberId?: string | null;
  campaignId?: string | null;
  at?: Date;
}

export async function billMessage(input: BillMessageInput): Promise<MessageBillingRecord> {
  const existing = await prisma.messageBillingRecord.findUnique({ where: { waMessageId: input.waMessageId } });
  if (existing) return existing;

  const at = input.at ?? new Date();
  const category = normalizeCategory(input.category);
  const market = marketFromPhone(input.recipient);
  const rate = await resolveRate(market, category, at);

  const metaRate = new Prisma.Decimal(rate?.metaRate ?? 0);
  const markup = new Prisma.Decimal(rate?.markup ?? 0);
  const finalRate = new Prisma.Decimal(rate?.customerRate ?? 0);
  // Service messages and anything Meta says isn't billable cost nothing.
  const billable = (input.billable ?? true) && category !== 'service' && finalRate.gt(0);

  const wallet = await getOrCreateWallet(input.tenantId);
  const walletMode = wallet.billingMode === 'wallet';

  let ledgerId: string | null = null;
  let walletDebit = new Prisma.Decimal(0);
  let billingStatus: string = billable ? 'charged' : 'not_billed';

  if (billable && walletMode) {
    const res = await debitWallet({
      tenantId: input.tenantId,
      type: 'message_debit',
      amount: finalRate,
      description: `${category} message to ${input.recipient}`,
      refType: 'message',
      refId: input.waMessageId,
      idempotencyKey: `msg:${input.waMessageId}`,
    });
    ledgerId = res.ledger.id;
    walletDebit = finalRate;
  }

  let record: MessageBillingRecord;
  try {
    record = await prisma.messageBillingRecord.create({
      data: {
        tenantId: input.tenantId,
        wabaId: input.wabaId ?? null,
        phoneNumberId: input.phoneNumberId ?? null,
        recipient: input.recipient,
        waMessageId: input.waMessageId,
        campaignId: input.campaignId ?? null,
        category,
        market,
        metaRate,
        markup,
        finalRate,
        billable,
        billingStatus,
        walletDebit,
        ledgerId,
        rateId: rate?.id ?? null,
        at,
      },
    });
  } catch (e) {
    // Lost a race on the unique waMessageId — return the winning record.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const won = await prisma.messageBillingRecord.findUnique({ where: { waMessageId: input.waMessageId } });
      if (won) return won;
    }
    throw e;
  }

  // Low-balance alert after a debit (§38), deduped so it fires once per dip.
  if (billable && walletMode) {
    const w = await getOrCreateWallet(input.tenantId);
    if (w.lowBalanceThreshold && new Prisma.Decimal(w.balance).lte(w.lowBalanceThreshold)) {
      await notify({
        tenantId: input.tenantId,
        category: 'wallet',
        kind: 'low_balance',
        severity: 'warning',
        title: 'WhatsApp balance is low',
        body: `Your WhatsApp wallet is at ₹${new Prisma.Decimal(w.balance).toFixed(2)}. Recharge to keep campaigns running.`,
        dedupeKey: `low:${w.lowBalanceThreshold.toString()}`,
      });
    }
  }

  return record;
}
