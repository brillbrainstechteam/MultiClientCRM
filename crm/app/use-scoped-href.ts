import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

const SCOPE_KEYS = ['role', 'branchId', 'whatsappNumberId'] as const;

/**
 * Builds an in-app href that carries the current scope (role/branch/number) so
 * cross-screen navigation never loses tenant context. Extra query params can be
 * merged in for filtered-list links (e.g. `{ stage: 'qualified' }`).
 */
export function useScopedHref(): (path: string, extra?: Record<string, string>) => string {
  const [searchParams] = useSearchParams();

  return useCallback(
    (path: string, extra?: Record<string, string>) => {
      const params = new URLSearchParams();
      for (const key of SCOPE_KEYS) {
        const value = searchParams.get(key);
        if (value) params.set(key, value);
      }
      if (extra) {
        for (const [key, value] of Object.entries(extra)) params.set(key, value);
      }
      const query = params.toString();
      return query ? `${path}?${query}` : path;
    },
    [searchParams],
  );
}
