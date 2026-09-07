import { useSearchParams } from 'react-router-dom';

/**
 * Shared reader for the reproducible-overlay query convention
 * (03_GLOBAL_REACT_PROTOTYPE_RULES.md). Modules use this instead of inventing
 * their own state keys, so every capture URL looks the same:
 *
 *   ?drawer=add-contact   ?modal=export   ?state=no-results
 */
export interface ScreenState {
  /** e.g. `no-results`, `loading`, `error`, `restricted`, `disconnected`. */
  state: string | null;
  drawer: string | null;
  modal: string | null;
  /** Route to return to when the user closes/cancels a drilled-in view. */
  returnTo: string | null;
  setKey: (key: 'state' | 'drawer' | 'modal' | 'returnTo', value: string | null) => void;
}

export function useScreenState(): ScreenState {
  const [searchParams, setSearchParams] = useSearchParams();

  return {
    state: searchParams.get('state'),
    drawer: searchParams.get('drawer'),
    modal: searchParams.get('modal'),
    returnTo: searchParams.get('returnTo'),
    setKey: (key, value) => {
      setSearchParams((previous) => {
        const params = new URLSearchParams(previous);
        if (value === null) params.delete(key);
        else params.set(key, value);
        return params;
      });
    },
  };
}
