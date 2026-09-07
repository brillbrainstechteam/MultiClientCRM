import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

const SCOPE_KEYS = ['role', 'branchId', 'whatsappNumberId'] as const;

/**
 * Like `useScopedHref`, but safe for targets that already carry a query string
 * (most Dashboard drill-downs do, e.g. `/inbox?status=pending&returnTo=…`). It
 * merges the current scope keys into the existing query without duplicating `?`.
 */
export function useDashboardHref(): (path: string) => string {
  const [searchParams] = useSearchParams();
  return useCallback(
    (path: string) => {
      const [base, existing] = path.split('?');
      const params = new URLSearchParams(existing ?? '');
      for (const key of SCOPE_KEYS) {
        const value = searchParams.get(key);
        if (value && !params.has(key)) params.set(key, value);
      }
      const query = params.toString();
      return query ? `${base}?${query}` : base;
    },
    [searchParams],
  );
}
