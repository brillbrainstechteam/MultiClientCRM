import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AlertStatus } from '@crm/mock-data';

/**
 * Session-local alert status overrides (acknowledge/dismiss/resolve). Lives
 * above both Dashboard routes so DASH-S02 (alert list), DASH-S01's Attention
 * section and DASH-S03 (alert detail) all reflect the same action instantly.
 * Prototype-only: nothing persists past a reload (CLAUDE.md §6 — no fake
 * backend/persistence beyond what is needed to demonstrate the flow).
 */
export interface AlertStatusContextValue {
  overrides: Record<string, AlertStatus>;
  acknowledge: (alertId: string) => void;
  dismiss: (alertId: string) => void;
  resolve: (alertId: string) => void;
}

const AlertStatusContext = createContext<AlertStatusContextValue | null>(null);

export function AlertStatusProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, AlertStatus>>({});

  const value = useMemo<AlertStatusContextValue>(
    () => ({
      overrides,
      acknowledge: (alertId) => setOverrides((prev) => ({ ...prev, [alertId]: 'acknowledged' })),
      dismiss: (alertId) => setOverrides((prev) => ({ ...prev, [alertId]: 'dismissed' })),
      resolve: (alertId) => setOverrides((prev) => ({ ...prev, [alertId]: 'resolved' })),
    }),
    [overrides],
  );

  return <AlertStatusContext.Provider value={value}>{children}</AlertStatusContext.Provider>;
}

export function useAlertStatus(): AlertStatusContextValue {
  const context = useContext(AlertStatusContext);
  if (!context) {
    throw new Error('useAlertStatus must be used inside <AlertStatusProvider>.');
  }
  return context;
}
