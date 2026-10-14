import { useCallback, useEffect, useState } from 'react';

/**
 * The workspace's real onboarding state, from /api/crm/setup.
 *
 * The checklist used to be a constant in the fixtures with its statuses written
 * into the source, so it told every workspace the same story regardless of what
 * was actually set up. This asks the database instead.
 */

export type SetupStepStatus = 'complete' | 'incomplete' | 'blocked';

export interface SetupStepDTO {
  id: string;
  label: string;
  status: SetupStepStatus;
  blockedReason?: string;
  detail?: string;
  to?: string;
  isNext?: boolean;
}

export interface SetupTeamState {
  /** True once a plan and a connected number exist — team building can start. */
  unlocked: boolean;
  /** Active members who are not the account owner. */
  memberCount: number;
  seatsUsed: number;
  plan: string;
  contactsTotal: number;
  contactsDelegated: number;
}

export interface SetupState {
  steps: SetupStepDTO[];
  percent: number;
  complete: boolean;
  team: SetupTeamState;
}

export function useSetupState(): {
  setup: SetupState | null;
  loading: boolean;
  reload: () => void;
} {
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    fetch('/api/crm/setup', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: SetupState & { error?: string }) => {
        // A failure here must never blank the dashboard — the checklist is
        // guidance, not the page.
        if (!d.error) setSetup(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { setup, loading, reload };
}
