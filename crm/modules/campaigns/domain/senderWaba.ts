import type { WhatsAppNumber } from '@crm/mock-data';
import { wabas } from '@crm/modules/templates/data';
import type { WhatsAppBusinessAccount } from '@crm/modules/templates/domain/types';

/**
 * Templates are governed at the WABA level while Campaigns selects a sender
 * at the phone-number level (CODE_FIRST_ADAPTER.md "WABA scope vs
 * phone-number scope" / CLAUDE.md §Template selection "If sender changes,
 * template compatibility must be revalidated"). No explicit number→WABA
 * field exists yet, so this resolves it the same way the fixtures already
 * agree with each other: `WhatsAppNumber.brand` matches `WhatsAppBusinessAccount.name`
 * (e.g. "Northline Retail" numbers vs the "Northline Service" number/WABA).
 */
export function wabaForSender(sender: WhatsAppNumber | undefined): WhatsAppBusinessAccount | undefined {
  if (!sender) return undefined;
  return wabas.find((waba) => waba.name === sender.brand);
}
