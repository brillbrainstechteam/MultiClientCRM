import { useSearchParams } from 'react-router-dom';
import { useAppSession } from './app-session';

/**
 * Whether the workspace has a connected WhatsApp number.
 *
 * Source of truth is the persisted app session (a fresh browser starts NOT
 * connected → Dashboard zero state; finishing onboarding flips it). `?connected=0|1`
 * still overrides for reproducible captures without changing the stored session.
 */
export function useConnectionStatus(): { connected: boolean } {
  const { connected } = useAppSession();
  const [searchParams] = useSearchParams();
  const forced = searchParams.get('connected');

  if (forced === '0') return { connected: false };
  if (forced === '1') return { connected: true };

  return { connected };
}
