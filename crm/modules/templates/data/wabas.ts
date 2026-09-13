import type { WhatsAppBusinessAccount } from '../domain/types';

/**
 * WhatsApp Business Account fixtures. No WABA entity exists elsewhere in the
 * prototype yet — `WhatsAppNumber` in `mock-data/workspace.ts` is phone-number
 * level. Templates are WABA-level Meta assets (spec §WABA scope vs
 * phone-number scope), so this is a new, Templates-local fixture set.
 */
export let wabas: WhatsAppBusinessAccount[] = [
  {
    id: 'waba_main',
    name: 'Northline Retail',
    wabaMetaId: '102019834471203',
    country: 'India',
    commerceConnected: true,
    catalogueConnected: true,
    flowAvailable: true,
    paymentAvailable: true,
    permittedRoles: ['owner', 'manager', 'agent'],
  },
  {
    id: 'waba_service_north',
    name: 'Northline Service',
    wabaMetaId: '102019834471987',
    country: 'India',
    commerceConnected: false,
    catalogueConnected: false,
    flowAvailable: false,
    paymentAvailable: false,
    permittedRoles: ['owner', 'manager'],
  },
];

export function findWaba(wabaId: string): WhatsAppBusinessAccount | undefined {
  return wabas.find((waba) => waba.id === wabaId);
}

/**
 * Replace the fixtures with the tenant's real connected WABA (hydrated from
 * /api/crm/templates at startup). Templates carry the real WABA id, so the
 * scope selector has to as well or every template falls out of scope.
 */
export function setWabas(next: WhatsAppBusinessAccount[]): void {
  if (next.length) wabas = next;
}
