/**
 * WhatsApp Calling API — Graph wrappers (Part 2 doc §5).
 *
 * Server-only. Every shape here is taken from Meta's calling documentation
 * (call-settings, user-initiated-calls, business-initiated-calls and
 * user-call-permissions), not inferred:
 *
 *   POST /{phone-number-id}/calls             connect | pre_accept | accept | reject | terminate
 *   GET  /{phone-number-id}/settings          the `calling` object
 *   POST /{phone-number-id}/settings          same object, all fields optional
 *   GET  /{phone-number-id}/call_permissions  status + what we are still allowed to do
 *   POST /{phone-number-id}/messages          interactive `call_permission_request`
 *
 * Media is deliberately absent. Signalling runs here; the audio itself is
 * WebRTC/SRTP between the agent's browser and Meta, or SIP to a PBX, and
 * neither belongs on the application server.
 */
import { graphBase } from './config';

export interface CallingResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  /** Meta's numeric error code, when it gave one — worth branching on. */
  code?: number;
}

async function callGraph<T>(
  url: string,
  token: string,
  init?: { method?: string; body?: unknown },
): Promise<CallingResult<T>> {
  try {
    const res = await fetch(url, {
      method: init?.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
      error?: { message?: string; code?: number; error_data?: { details?: string } };
    };
    if (!res.ok || json.error) {
      const e = json.error;
      return {
        ok: false,
        code: e?.code,
        error: e?.error_data?.details ?? e?.message ?? `Graph call failed (${res.status})`,
      };
    }
    return { ok: true, data: json as T };
  } catch (e) {
    // A network failure mid-call is not the same as Meta refusing us, and the
    // caller needs to tell those apart before it retries.
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ---- Call actions ----------------------------------------------------------

export type CallAction = 'connect' | 'pre_accept' | 'accept' | 'reject' | 'terminate';

export interface CallSession {
  sdp_type: 'offer' | 'answer';
  sdp: string;
}

export interface ConnectResult {
  messaging_product?: string;
  calls?: Array<{ id: string }>;
  success?: boolean;
}

/**
 * Ring a customer. Only legal when a call permission is live — Meta rejects it
 * otherwise, and we check first anyway so the agent gets a sentence rather than
 * an error code.
 */
export async function startCall(
  phoneNumberId: string,
  token: string,
  to: string,
  session: CallSession,
  opts?: { callbackData?: string },
): Promise<CallingResult<ConnectResult>> {
  return callGraph<ConnectResult>(`${graphBase()}/${phoneNumberId}/calls`, token, {
    method: 'POST',
    body: {
      messaging_product: 'whatsapp',
      to,
      action: 'connect',
      session,
      ...(opts?.callbackData ? { biz_opaque_callback_data: opts.callbackData } : {}),
    },
  });
}

/**
 * Answer, half-answer, decline or hang up an existing call.
 *
 * `pre_accept` is worth using before `accept`: it lets media start flowing
 * early so the first second of audio is not lost, which is the difference
 * between "hello?" and "...hello?".
 */
export async function actOnCall(
  phoneNumberId: string,
  token: string,
  callId: string,
  action: Exclude<CallAction, 'connect'>,
  session?: CallSession,
  opts?: { callbackData?: string },
): Promise<CallingResult<{ success?: boolean }>> {
  const needsSession = action === 'pre_accept' || action === 'accept';
  if (needsSession && !session) {
    return { ok: false, error: `A ${action} needs an SDP answer.` };
  }
  return callGraph(`${graphBase()}/${phoneNumberId}/calls`, token, {
    method: 'POST',
    body: {
      messaging_product: 'whatsapp',
      call_id: callId,
      action,
      ...(needsSession ? { session } : {}),
      ...(opts?.callbackData ? { biz_opaque_callback_data: opts.callbackData } : {}),
    },
  });
}

// ---- Permissions -----------------------------------------------------------

export interface PermissionActionLimit {
  time_period: string;        // ISO-8601 duration, e.g. "PT24H" or "P7D"
  max_allowed: number;
  current_usage: number;
  limit_expiration_time?: number;
}

export interface PermissionStatus {
  /** no_permission | temporary | permanent */
  status: string;
  /** Epoch seconds. Absent for a permanent permission. */
  expiresAt: number | null;
  /** False when a request would be refused — we must not offer the button. */
  canRequest: boolean;
  /** False when the call itself would be refused, e.g. the daily cap is hit. */
  canCall: boolean;
  /** Why not, in the limits Meta reported, so the UI can say when to retry. */
  requestLimits: PermissionActionLimit[];
  callLimits: PermissionActionLimit[];
}

interface RawPermissionResponse {
  permission?: { status?: string; expiration_time?: number; expiration?: number };
  actions?: Array<{
    action_name?: string;
    can_perform_action?: boolean;
    limits?: PermissionActionLimit[];
  }>;
}

/**
 * What Meta currently allows for this one customer.
 *
 * Meta is the authority on permission, not us: the customer can revoke at any
 * time, four unanswered calls revoke it automatically, and a temporary grant
 * expires silently with no webhook. Anything we cache is a guess, so the
 * answer is re-read from here before a call is placed.
 */
export async function getCallPermission(
  phoneNumberId: string,
  token: string,
  userWaId: string,
): Promise<CallingResult<PermissionStatus>> {
  const url = `${graphBase()}/${phoneNumberId}/call_permissions?user_wa_id=${encodeURIComponent(userWaId)}`;
  const r = await callGraph<RawPermissionResponse>(url, token);
  if (!r.ok || !r.data) return { ok: false, error: r.error, code: r.code };

  const p = r.data.permission ?? {};
  const actions = r.data.actions ?? [];
  const find = (name: string) => actions.find((a) => a.action_name === name);
  const req = find('send_call_permission_request');
  const start = find('start_call');

  return {
    ok: true,
    data: {
      status: p.status ?? 'no_permission',
      // The docs name this field two different ways; read both rather than
      // silently treating a live permission as absent.
      expiresAt: p.expiration_time ?? p.expiration ?? null,
      canRequest: req?.can_perform_action ?? true,
      canCall: start?.can_perform_action ?? false,
      requestLimits: req?.limits ?? [],
      callLimits: start?.limits ?? [],
    },
  };
}

/**
 * Ask the customer for permission to call them.
 *
 * Inside the 24-hour service window this is an interactive message. Outside it,
 * Meta requires an approved template carrying a `call_permission_request`
 * component — pass its name and the caller gets the template route instead.
 */
export async function requestCallPermission(
  phoneNumberId: string,
  token: string,
  to: string,
  opts?: { text?: string; templateName?: string; templateLang?: string },
): Promise<CallingResult<{ messages?: Array<{ id: string }> }>> {
  const body = opts?.templateName
    ? {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: {
          name: opts.templateName,
          language: { code: opts.templateLang ?? 'en' },
        },
      }
    : {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'call_permission_request',
          action: { name: 'call_permission_request' },
          // Optional per Meta, but a bare permission prompt with no reason is
          // the kind of thing people decline on reflex.
          ...(opts?.text ? { body: { text: opts.text } } : {}),
        },
      };

  return callGraph(`${graphBase()}/${phoneNumberId}/messages`, token, { method: 'POST', body });
}

// ---- Settings --------------------------------------------------------------

export interface MetaWeeklyHours {
  day_of_week: string;        // MONDAY … SUNDAY
  open_time: string;          // "HHMM"
  close_time: string;         // "HHMM"
}

export interface MetaHoliday {
  date: string;               // YYYY-MM-DD
  start_time?: string;
  end_time?: string;
}

export interface MetaCallingSettings {
  status?: 'ENABLED' | 'DISABLED';
  call_icon_visibility?: 'DEFAULT' | 'DISABLE_ALL';
  callback_permission_status?: 'ENABLED' | 'DISABLED';
  call_hours?: {
    status?: 'ENABLED' | 'DISABLED';
    timezone_id?: string;
    weekly_operating_hours?: MetaWeeklyHours[];
    holiday_schedule?: MetaHoliday[];
  };
  sip?: { status?: 'ENABLED' | 'DISABLED'; servers?: Array<Record<string, unknown>> };
  voicemail?: {
    status?: 'ENABLED' | 'DISABLED';
    triggers?: Array<'REJECT' | 'TIMEOUT'>;
    audio?: { default?: { announcement_media_id?: string | number; timeout_seconds?: number } };
  };
  audio?: { additional_codecs?: string[] };
}

/** Read the number's live calling configuration from Meta. */
export async function getCallingSettings(
  phoneNumberId: string,
  token: string,
): Promise<CallingResult<MetaCallingSettings>> {
  const r = await callGraph<{ calling?: MetaCallingSettings }>(
    `${graphBase()}/${phoneNumberId}/settings`,
    token,
  );
  if (!r.ok) return { ok: false, error: r.error, code: r.code };
  return { ok: true, data: r.data?.calling ?? {} };
}

/**
 * Push calling configuration to Meta.
 *
 * `call_hours` is replace-not-merge on Meta's side, and omitting
 * `holiday_schedule` clears it — so the caller must always send the complete
 * hours object it wants to end up with, never a patch.
 */
export async function updateCallingSettings(
  phoneNumberId: string,
  token: string,
  calling: MetaCallingSettings,
): Promise<CallingResult<{ success?: boolean }>> {
  return callGraph(`${graphBase()}/${phoneNumberId}/settings`, token, {
    method: 'POST',
    body: { calling },
  });
}
