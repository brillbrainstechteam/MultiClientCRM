import { useSearchParams } from 'react-router-dom';
import { wabas } from './data/wabas';
import type { WhatsAppBusinessAccount } from './domain/types';

/**
 * WABA scope for the whole module (spec §WABA scope vs phone-number scope).
 * One WABA → no selector, always scoped to it. Multiple WABAs → `?waba=`
 * drives an explicit selector, defaulting to "all" in the repository.
 */
export function useWabaScope(): {
  multiWaba: boolean;
  selectedWabaId: string;
  selectedWaba: WhatsAppBusinessAccount | undefined;
  wabas: WhatsAppBusinessAccount[];
} {
  const [searchParams] = useSearchParams();
  const requested = searchParams.get('waba');
  const multiWaba = wabas.length > 1;

  if (!multiWaba) {
    return { multiWaba, selectedWabaId: wabas[0].id, selectedWaba: wabas[0], wabas };
  }

  const selectedWabaId =
    requested && (requested === 'all' || wabas.some((w) => w.id === requested)) ? requested : 'all';
  const selectedWaba = selectedWabaId === 'all' ? undefined : wabas.find((w) => w.id === selectedWabaId);
  return { multiWaba, selectedWabaId, selectedWaba, wabas };
}

/** A definite target WABA is required outside the repository (creation, submission). */
export function useTargetWaba(): WhatsAppBusinessAccount {
  const { selectedWaba, wabas: all } = useWabaScope();
  return selectedWaba ?? all[0];
}
