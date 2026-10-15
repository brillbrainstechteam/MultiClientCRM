import { metaConfig } from '@/lib/meta/config';

/**
 * Embedded Signup session handling.
 *
 * Two things this file exists to get right, both of which were wrong:
 *
 * 1. **The version.** `sessionInfoVersion: '3'` is a **v2-only** extra — it is
 *    how a v2 integration asks for the session payload at all. Passing it means
 *    running v2, which Meta deprecates on **15 October 2026**. v4 selects itself
 *    from the Facebook Login for Business configuration (products chosen there),
 *    returns session info for every flow without being asked, and wants
 *    `extras` left empty apart from `setup`.
 *
 * 2. **The finish events.** A completed flow reports *how* it completed, and
 *    the two that look alike are not:
 *      - `FINISH_ONLY_WABA` — finished **without a phone number**.
 *      - `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING` — finished with a number that
 *        stays live in the WhatsApp Business app. This is coexistence.
 *    Treating the first as coexistence (as we did) both mislabels a no-number
 *    WABA and misses real coexistence connections, which decides whether the
 *    one-time 24-hour history sync is ever requested.
 *
 * Also worth noting: a user-reported error arrives with `event: 'CANCEL'` and
 * error fields in `data`, not with `event: 'ERROR'`. Reading only the event name
 * throws away the error code and session id, which are exactly what Meta support
 * asks for.
 */

/** Finish events Meta can return, per the v4 implementation reference. */
export type FinishEvent =
  | 'FINISH'
  | 'FINISH_ONLY_WABA'
  | 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'
  | 'FINISH_OBO_MIGRATION'
  | 'FINISH_GRANT_ONLY_API_ACCESS'
  | 'ERROR';

export type ConnectionMode =
  | 'new_cloud_api' | 'coexistence' | 'migrated_from_business_app' | 'migrated_from_bsp';

export interface SessionEvent {
  kind: 'finish' | 'cancel' | 'error' | 'unknown';
  event: string | null;
  wabaId: string | null;
  phoneNumberId: string | null;
  /** The customer's business portfolio id — useful for support and asset lookup. */
  businessId: string | null;
  /** Screen they abandoned on, when they abandoned. */
  currentStep: string | null;
  errorMessage: string | null;
  /** Meta's error code and session id: quote both when raising a support case. */
  errorCode: string | null;
  sessionId: string | null;
  timestamp: string | null;
}

const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : null;

/**
 * Parse a `WA_EMBEDDED_SIGNUP` message event into something decidable.
 *
 * Shapes differ by outcome — completion carries asset ids, abandonment carries
 * `current_step`, and a reported error carries error fields under a `CANCEL`
 * event — so all three are read rather than switching on the event name alone.
 */
export function parseSessionEvent(raw: unknown): SessionEvent {
  const payload = (raw ?? {}) as { event?: unknown; data?: Record<string, unknown> };
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const event = str(payload.event);

  const errorMessage = str(data.error_message);
  const errorCode = str(data.error_code);
  const sessionId = str(data.session_id);

  const base: Omit<SessionEvent, 'kind'> = {
    event,
    wabaId: str(data.waba_id),
    phoneNumberId: str(data.phone_number_id),
    businessId: str(data.business_id),
    currentStep: str(data.current_step),
    errorMessage,
    errorCode,
    sessionId,
    timestamp: str(data.timestamp),
  };

  // A reported error arrives as CANCEL with error fields; the error fields are
  // the signal, not the event name.
  if (errorMessage || errorCode) return { kind: 'error', ...base };
  if (event === 'ERROR') return { kind: 'error', ...base };
  if (event === 'CANCEL') return { kind: 'cancel', ...base };
  if (event && event.startsWith('FINISH')) return { kind: 'finish', ...base };
  return { kind: 'unknown', ...base };
}

/**
 * What kind of connection this completion actually created.
 *
 * The event is authoritative when it says so. The strategy the customer picked
 * on our own screen is the fallback, because `FINISH` alone does not
 * distinguish a brand-new number from one taken over from another provider.
 */
export function connectionModeFromEvent(
  event: string | null,
  strategy: string | null,
): ConnectionMode {
  switch (event) {
    case 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING':
      return 'coexistence';
    case 'FINISH_OBO_MIGRATION':
      // On-behalf-of migration: the number moves from another provider's
      // ownership to the customer's own. Their old CRM history does not come.
      return 'migrated_from_bsp';
    default:
      break;
  }
  if (strategy === 'coexistence') return 'coexistence';
  if (strategy === 'existing') return 'migrated_from_bsp';
  return 'new_cloud_api';
}

/** True when this completion produced a WABA but no phone number yet. */
export function isWabaOnly(event: string | null): boolean {
  return event === 'FINISH_ONLY_WABA' || event === 'FINISH_GRANT_ONLY_API_ACCESS';
}

/**
 * `extras` for the FB.login / OAuth dialog.
 *
 * v4 takes its product set from the Login configuration, so extras carry only
 * `setup`. v2 and v3 must ask for the session payload explicitly, which is what
 * `sessionInfoVersion` does.
 *
 * The default stays on the v2 shape on purpose. The configuration's version is
 * not visible from here, and the two mistakes are not equally bad: sending
 * `sessionInfoVersion` to a v4 configuration is merely redundant, while
 * omitting it from a v2 one stops the session payload coming back and breaks
 * onboarding. Flip NEXT_PUBLIC_META_ES_VERSION to v4 only once the v4
 * configuration exists and its id is in NEXT_PUBLIC_META_CONFIG_ID.
 */
export function launchExtras(path: string): Record<string, unknown> {
  const version = metaConfig.embeddedSignupVersion;
  const extras: Record<string, unknown> = { setup: {} };

  if (version === 'v4') {
    if (metaConfig.embeddedSignupPreview) extras.version = 'v4-public-preview';
  } else {
    // v2 / v3: ask for the session payload, or nothing comes back.
    extras.sessionInfoVersion = '3';
    // `version` is the v2/v3 selector; only send it when explicitly pinned to
    // v3, since v2 is selected by the configuration itself.
    if (version === 'v3') extras.version = 'v3';
  }

  // Coexistence is requested per-launch. Harmless when the configuration
  // already enables it, and required when it does not.
  if (path === 'coexistence' && metaConfig.coexistenceFeature) {
    extras.featureType = metaConfig.coexistenceFeature;
  }
  return extras;
}
