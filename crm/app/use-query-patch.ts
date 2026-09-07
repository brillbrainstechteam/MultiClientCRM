import { useCallback } from 'react';
import { useSearchParams, type URLSearchParamsInit } from 'react-router-dom';

/**
 * Generic query-string patch helper: merges/removes keys on the current URL
 * without touching ones the caller didn't mention. Used across Onboarding,
 * Settings → WhatsApp/History and Provider Admin so every drawer/modal/step is
 * a reproducible URL (CLAUDE.md §5) instead of hidden component state.
 */
export function useQueryPatch(): [
  URLSearchParams,
  (updates: Record<string, string | null | undefined>, options?: { replace?: boolean }) => void,
] {
  const [searchParams, setSearchParams] = useSearchParams();

  const patch = useCallback(
    (updates: Record<string, string | null | undefined>, options?: { replace?: boolean }) => {
      setSearchParams((prev: URLSearchParamsInit) => {
        const next = new URLSearchParams(prev as URLSearchParams);
        for (const [key, value] of Object.entries(updates)) {
          if (value === null || value === undefined) next.delete(key);
          else next.set(key, value);
        }
        return next;
      }, options);
    },
    [setSearchParams],
  );

  return [searchParams, patch];
}
