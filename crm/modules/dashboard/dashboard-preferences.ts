import { useCallback, useEffect, useState } from 'react';
import type { RoleKey } from '@crm/mock-data';

/**
 * DASH-S09 Customise Dashboard — widget visibility only (reorder is out of
 * scope for this prototype; see docs/build-status/dashboard.md). Persisted to
 * localStorage per role so Save survives a reload without a fake backend
 * (CLAUDE.md §6).
 */
export const customisableWidgets = [
  { key: 'setup', label: 'Setup checklist' },
  { key: 'businessSnapshot', label: 'Business snapshot' },
  { key: 'whatsappHealth', label: 'WhatsApp health + Inbox' },
  { key: 'salesCalling', label: 'Sales & follow-ups + Campaigns' },
  { key: 'ordersTeam', label: 'Orders & payments + Team workload' },
  { key: 'automation', label: 'Automation health' },
  { key: 'trends', label: 'Trends' },
  { key: 'aiSummary', label: 'AI business summary' },
  { key: 'activity', label: 'Recent activity + Continue work' },
] as const;

export type CustomisableWidgetKey = (typeof customisableWidgets)[number]['key'];
export type WidgetVisibility = Record<CustomisableWidgetKey, boolean>;

function defaultVisibility(): WidgetVisibility {
  const visibility = {} as WidgetVisibility;
  for (const widget of customisableWidgets) visibility[widget.key] = true;
  return visibility;
}

function storageKey(role: RoleKey): string {
  return `crm-dashboard-widget-visibility:${role}`;
}

function readStored(role: RoleKey): WidgetVisibility {
  try {
    const raw = window.localStorage.getItem(storageKey(role));
    if (!raw) return defaultVisibility();
    const parsed = JSON.parse(raw) as Partial<WidgetVisibility>;
    return { ...defaultVisibility(), ...parsed };
  } catch {
    return defaultVisibility();
  }
}

export function useDashboardWidgetPrefs(role: RoleKey) {
  const [visibility, setVisibility] = useState<WidgetVisibility>(() => readStored(role));

  useEffect(() => {
    setVisibility(readStored(role));
  }, [role]);

  const save = useCallback(
    (next: WidgetVisibility) => {
      setVisibility(next);
      try {
        window.localStorage.setItem(storageKey(role), JSON.stringify(next));
      } catch {
        // Storage unavailable (private browsing, etc.) — keep the in-memory value only.
      }
    },
    [role],
  );

  const reset = useCallback(() => {
    const next = defaultVisibility();
    save(next);
  }, [save]);

  return { visibility, save, reset };
}
