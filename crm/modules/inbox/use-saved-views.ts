import { useCallback, useEffect, useState } from 'react';
import type { InboxFilterState, QuickViewKey } from './inbox-types';

/**
 * Saved inbox views — a named filter combination such as "hot leads waiting
 * over a day".
 *
 * The stored payload is the filter state plus the quick view it started from,
 * because those two together are what an operator actually sees. Saving only
 * the filters would reopen "hot leads waiting over a day" against All Chats
 * when it was built against Needs Reply, and quietly return a different list.
 */

export interface SavedViewPayload {
  /** The quick view the filters were built on top of. */
  view: QuickViewKey;
  filters: InboxFilterState;
  /** How the list was sorted, so the view reopens exactly as it was saved. */
  sort?: string;
}

export interface SavedView {
  id: string;
  name: string;
  filters: SavedViewPayload;
  isPinned: boolean;
  scope: 'personal' | 'workspace';
  sortOrder: number;
  updatedAt: string;
}

export function useSavedViews() {
  const [views, setViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/crm/inbox/views', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: { views?: SavedView[]; error?: string }) => {
        if (d.error) setError(d.error);
        else setViews(d.views ?? []);
        setLoading(false);
      })
      // Saved views are a convenience; a failure here must not break the inbox.
      .catch(() => { setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (input: {
    name: string;
    payload: SavedViewPayload;
    scope: 'personal' | 'workspace';
    isPinned?: boolean;
  }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const res = await fetch('/api/crm/inbox/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        name: input.name,
        filters: input.payload,
        scope: input.scope,
        isPinned: input.isPinned ?? false,
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: (d as { error?: string }).error ?? 'Could not save the view.' };
    load();
    return { ok: true };
  }, [load]);

  const remove = useCallback(async (id: string): Promise<{ ok: boolean; error?: string }> => {
    const res = await fetch(`/api/crm/inbox/views/${id}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: (d as { error?: string }).error ?? 'Could not delete.' };
    load();
    return { ok: true };
  }, [load]);

  return { views, loading, error, reload: load, save, remove };
}
