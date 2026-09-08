import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { whatsappNumbers } from '@crm/mock-data/workspace';

/**
 * Lightweight, browser-persisted account/session state for the prototype.
 *
 * Real products track this server-side; here it lives in localStorage so the
 * dashboard reflects a *real* state that survives reloads: a brand-new browser
 * starts NOT connected (first-run zero state), signing up keeps it that way,
 * and finishing onboarding flips it to connected. Plan / trial / wallet are
 * kept here too so billing and the dashboard credits read from one source.
 *
 * `?connected=0|1` still overrides for reproducible captures (handled in
 * `useConnectionStatus`), independent of the stored session.
 */

export type PlanKey = 'trial' | 'starter' | 'growth' | 'advanced';

export interface SessionState {
  connected: boolean;
  plan: PlanKey;
  trialDaysLeft: number;
  /** Prepaid messaging wallet balance in ₹ (Meta message costs draw from this). */
  walletBalance: number;
  /** Free platform conversations remaining this cycle. */
  freeConversationsLeft: number;
}

export interface AppSessionValue extends SessionState {
  setConnected: (value: boolean) => void;
  setPlan: (plan: PlanKey) => void;
  addWallet: (amount: number) => void;
  reset: () => void;
}

const STORAGE_KEY = 'talktrack.session.v1';

const DEFAULT_STATE: SessionState = {
  // A fresh browser is a first-run user: not connected → Dashboard zero state.
  connected: false,
  plan: 'trial',
  trialDaysLeft: 7,
  walletBalance: 0,
  freeConversationsLeft: 1000,
};

function loadState(): SessionState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const connected = whatsappNumbers.length > 0; // real: derived from connected numbers
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE, connected };
    return { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<SessionState>), connected };
  } catch {
    return { ...DEFAULT_STATE, connected: whatsappNumbers.length > 0 };
  }
}

function saveState(state: SessionState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota/security errors in the prototype */
  }
}

const AppSessionContext = createContext<AppSessionValue | null>(null);

export function AppSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(loadState);

  const update = useCallback((patch: Partial<SessionState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      saveState(next);
      return next;
    });
  }, []);

  const value = useMemo<AppSessionValue>(
    () => ({
      ...state,
      setConnected: (connected) => update({ connected }),
      setPlan: (plan) => update({ plan }),
      addWallet: (amount) => update({ walletBalance: Math.max(0, state.walletBalance + amount) }),
      reset: () => {
        saveState(DEFAULT_STATE);
        setState(DEFAULT_STATE);
      },
    }),
    [state, update],
  );

  return <AppSessionContext.Provider value={value}>{children}</AppSessionContext.Provider>;
}

export function useAppSession(): AppSessionValue {
  const context = useContext(AppSessionContext);
  if (!context) throw new Error('useAppSession must be used inside <AppSessionProvider>.');
  return context;
}

export const PLAN_LABELS: Record<PlanKey, string> = {
  trial: 'Free trial',
  starter: 'Starter',
  growth: 'Growth',
  advanced: 'Advanced',
};
