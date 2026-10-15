/**
 * WhatsApp Calling — domain logic (Part 2 doc §5).
 *
 * This is the half of calling that is ours rather than Meta's: the call state
 * machine, the permission gate that stands in front of every business-initiated
 * call, business hours in SME terms, and turning `calls` webhook events into
 * rows an agent can see. The Graph wrappers live in lib/meta/calling-api.ts.
 *
 * Two rules shape everything here:
 *
 *  1. Meta is the authority on permission, we are not. A temporary grant
 *     expires after seven days with no webhook to tell us, four unanswered
 *     calls revoke a grant automatically, and the customer can revoke at any
 *     moment. So our table is a cache for display and rate-limiting, and the
 *     live check happens against Meta immediately before a call is placed.
 *  2. Every signalling event is recorded. "The call dropped" is otherwise an
 *     unanswerable support question.
 */
import { prisma } from '@/lib/db';
import {
  getCallPermission,
  requestCallPermission,
  type MetaCallingSettings,
  type MetaWeeklyHours,
} from '@/lib/meta/calling-api';

/** Meta grants a temporary call permission for seven calendar days. */
export const TEMPORARY_PERMISSION_DAYS = 7;
/** Per business/user pair, per Meta: one request a day, two a week. */
export const PERMISSION_REQUESTS_PER_DAY = 1;
export const PERMISSION_REQUESTS_PER_WEEK = 2;

export type CallStatus =
  | 'ringing' | 'pre_accepted' | 'connecting' | 'connected'
  | 'ended' | 'missed' | 'rejected' | 'failed';

/** States a call can still leave — anything else is final. */
const LIVE_STATES: CallStatus[] = ['ringing', 'pre_accepted', 'connecting', 'connected'];

export function isLive(status: string): boolean {
  return LIVE_STATES.includes(status as CallStatus);
}

// ---- Business hours --------------------------------------------------------

export interface DayHours {
  /** 0 = Sunday … 6 = Saturday, matching Date#getDay. */
  day: number;
  open: string;   // "HH:MM"
  close: string;  // "HH:MM"
}

export interface Holiday {
  date: string;   // YYYY-MM-DD
  name?: string;
}

const META_DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

function toMetaTime(hhmm: string): string {
  return hhmm.replace(':', '').padStart(4, '0');
}

function fromMetaTime(hhmm: string): string {
  const s = hhmm.padStart(4, '0');
  return `${s.slice(0, 2)}:${s.slice(2)}`;
}

/** Our day list → Meta's weekly_operating_hours. */
export function toMetaHours(days: DayHours[]): MetaWeeklyHours[] {
  return days
    .filter((d) => d.day >= 0 && d.day <= 6 && d.open && d.close)
    .map((d) => ({
      day_of_week: META_DAYS[d.day],
      open_time: toMetaTime(d.open),
      close_time: toMetaTime(d.close),
    }));
}

/** Meta's weekly_operating_hours → our day list. */
export function fromMetaHours(hours: MetaWeeklyHours[] | undefined): DayHours[] {
  return (hours ?? []).flatMap((h) => {
    const day = META_DAYS.indexOf((h.day_of_week ?? '').toUpperCase());
    if (day < 0) return [];
    return [{ day, open: fromMetaTime(h.open_time ?? '0000'), close: fromMetaTime(h.close_time ?? '2359') }];
  });
}

/**
 * The local wall-clock day and minute in a given IANA zone.
 *
 * Business hours are written in the shop's own time, so evaluating them against
 * server time would close a Kochi jeweller's phone line at half past four in
 * the afternoon. Intl does the conversion without pulling in a date library.
 */
function localParts(at: Date, timezone: string): { day: number; minutes: number; date: string } {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    weekday: 'short', hour: '2-digit', minute: '2-digit',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(at).map((p) => [p.type, p.value]));
  const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = shortDays.indexOf(String(parts.weekday ?? '').slice(0, 3));
  // "24" is how en-GB spells midnight in hour12:false — it means the next day
  // has begun, which as a minute count is zero, not 1440.
  const hour = Number(parts.hour) % 24;
  const minutes = hour * 60 + Number(parts.minute ?? 0);
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return { day, minutes, date };
}

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export interface HoursVerdict {
  open: boolean;
  /** Why it is closed, in words an SME wrote themselves. */
  reason?: string;
}

/** Are we open for calls right now? */
export function isWithinBusinessHours(
  settings: {
    businessHours?: unknown;
    holidays?: unknown;
    timezone?: string | null;
  },
  at: Date = new Date(),
): HoursVerdict {
  const days = (settings.businessHours as DayHours[] | null) ?? null;
  // No hours configured means always open — the same as Meta's call_hours
  // status DISABLED, and the right default for a shop that has not told us.
  if (!days || days.length === 0) return { open: true };

  const tz = settings.timezone || 'Asia/Kolkata';
  let now;
  try {
    now = localParts(at, tz);
  } catch {
    // An invalid zone must not silently close the line.
    now = localParts(at, 'UTC');
  }

  const holidays = (settings.holidays as Holiday[] | null) ?? [];
  const holiday = holidays.find((h) => h.date === now.date);
  if (holiday) return { open: false, reason: holiday.name ? `Closed for ${holiday.name}` : 'Closed for a holiday' };

  const today = days.filter((d) => d.day === now.day);
  if (today.length === 0) return { open: false, reason: 'Closed today' };

  for (const slot of today) {
    const open = hhmmToMinutes(slot.open);
    const close = hhmmToMinutes(slot.close);
    if (now.minutes >= open && now.minutes < close) return { open: true };
  }
  const first = today[0];
  return { open: false, reason: `Open ${first.open}–${first.close}` };
}

// ---- Settings mapping ------------------------------------------------------

export interface CallingSettingsRow {
  enabled: boolean;
  callIconVisible: boolean;
  inboundEnabled: boolean;
  outboundEnabled: boolean;
  timezone: string;
  businessHours: unknown;
  holidays: unknown;
  afterHoursBehaviour: string;
}

/**
 * Our settings → the `calling` object Meta expects.
 *
 * call_hours is replace-not-merge on Meta's side, so this always produces the
 * complete object, never a patch.
 */
export function toMetaSettings(row: CallingSettingsRow): MetaCallingSettings {
  const days = (row.businessHours as DayHours[] | null) ?? [];
  const holidays = (row.holidays as Holiday[] | null) ?? [];

  return {
    status: row.enabled ? 'ENABLED' : 'DISABLED',
    // "Customers can call us: OFF" is Meta's DISABLE_ALL — it hides the call
    // button and shuts the external entry points (deep links, QR) with it.
    call_icon_visibility: row.enabled && row.inboundEnabled && row.callIconVisible ? 'DEFAULT' : 'DISABLE_ALL',
    // Callback permission is what lets a missed call turn into "may we ring you
    // back?", so it tracks whether we are allowed to call out at all.
    callback_permission_status: row.outboundEnabled ? 'ENABLED' : 'DISABLED',
    call_hours: {
      status: days.length > 0 ? 'ENABLED' : 'DISABLED',
      timezone_id: row.timezone || 'Asia/Kolkata',
      weekly_operating_hours: toMetaHours(days),
      holiday_schedule: holidays.slice(0, 20).map((h) => ({
        date: h.date, start_time: '0000', end_time: '2359',
      })),
    },
    voicemail: row.afterHoursBehaviour === 'voicemail'
      ? { status: 'ENABLED', triggers: ['REJECT', 'TIMEOUT'] }
      : { status: 'DISABLED' },
  };
}

/** Meta's `calling` object → the fields we mirror locally. */
export function fromMetaSettings(calling: MetaCallingSettings) {
  return {
    metaCallingStatus: calling.status ?? null,
    callIconVisible: calling.call_icon_visibility !== 'DISABLE_ALL',
    outboundEnabled: calling.callback_permission_status === 'ENABLED',
    timezone: calling.call_hours?.timezone_id ?? undefined,
    businessHours: calling.call_hours?.status === 'ENABLED'
      ? fromMetaHours(calling.call_hours.weekly_operating_hours)
      : [],
    holidays: (calling.call_hours?.holiday_schedule ?? []).map((h) => ({ date: h.date })),
  };
}

// ---- Permission gate -------------------------------------------------------

export interface CallGate {
  /** May the agent press Call right now? */
  canCall: boolean;
  /** none | pending | granted | denied | revoked | expired */
  permissionStatus: string;
  /** temporary | permanent | null */
  permissionType: string | null;
  expiresAt: Date | null;
  /** May we ask for permission, or would Meta refuse the request? */
  canRequestPermission: boolean;
  /** One sentence an agent can read. Never an API status string. */
  message: string;
  /** When a rate limit is what is blocking us, when it lifts. */
  retryAfter: Date | null;
}

/**
 * Everything the Call button needs to know, in one answer.
 *
 * Checked against Meta rather than our cache, because a cached "granted" that
 * Meta has since revoked means an agent presses Call and gets an error code.
 * The cache is updated as a side effect so the inbox list can render without a
 * round trip per row.
 */
export async function checkCallGate(args: {
  tenantId: string;
  phoneNumberId: string;
  token: string;
  contactPhone: string;
  contactName?: string | null;
  settings?: CallingSettingsRow | null;
}): Promise<CallGate> {
  const { tenantId, phoneNumberId, token, contactPhone } = args;
  const who = args.contactName?.split(' ')[0] || 'this customer';

  const settings = args.settings ?? await prisma.whatsAppCallingSettings.findUnique({
    where: { phoneNumberId },
  });

  const deny = (message: string): CallGate => ({
    canCall: false, permissionStatus: 'none', permissionType: null, expiresAt: null,
    canRequestPermission: false, message, retryAfter: null,
  });

  if (!settings || !settings.enabled) return deny('WhatsApp calling is switched off for this number.');
  if (!settings.outboundEnabled) return deny('Calling customers is switched off. Turn it on in Settings → WhatsApp → Calling.');

  const hours = isWithinBusinessHours(settings);
  if (!hours.open) return deny(hours.reason ? `Outside calling hours — ${hours.reason.toLowerCase()}.` : 'Outside your calling hours.');

  const live = await getCallPermission(phoneNumberId, token, contactPhone);
  if (!live.ok || !live.data) {
    // Meta being unreachable is not the same as being told no. Say so rather
    // than showing "no permission", which an agent would try to fix by asking.
    return { ...deny(`Could not check calling permission just now (${live.error ?? 'no response'}).`), canRequestPermission: false };
  }

  const p = live.data;
  const expiresAt = p.expiresAt ? new Date(p.expiresAt * 1000) : null;
  const granted = p.status === 'temporary' || p.status === 'permanent';
  const permissionType = granted ? (p.status === 'permanent' ? 'permanent' : 'temporary') : null;

  await cachePermission({
    tenantId, phoneNumberId, contactPhone,
    status: granted ? 'granted' : 'none',
    permissionType,
    expiresAt,
  });

  // A limit with no room left tells us when it frees up.
  const blockingLimit = p.callLimits.find((l) => l.current_usage >= l.max_allowed);
  const retryAfter = blockingLimit?.limit_expiration_time
    ? new Date(blockingLimit.limit_expiration_time * 1000)
    : null;

  if (!granted) {
    return {
      canCall: false,
      permissionStatus: 'none',
      permissionType: null,
      expiresAt: null,
      canRequestPermission: p.canRequest,
      message: p.canRequest
        ? `You need ${who}'s permission before making a WhatsApp call.`
        : `${who} has already been asked recently. You can ask again later.`,
      retryAfter,
    };
  }

  if (!p.canCall) {
    return {
      canCall: false,
      permissionStatus: 'granted',
      permissionType,
      expiresAt,
      canRequestPermission: false,
      message: retryAfter
        ? `Call limit reached for today. It resets at ${retryAfter.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.`
        : 'Calling is temporarily unavailable for this customer.',
      retryAfter,
    };
  }

  return {
    canCall: true,
    permissionStatus: 'granted',
    permissionType,
    expiresAt,
    canRequestPermission: false,
    message: permissionType === 'permanent'
      ? `${who} has allowed WhatsApp calls.`
      : expiresAt
        ? `${who} has allowed calls until ${expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.`
        : `${who} has allowed WhatsApp calls.`,
    retryAfter: null,
  };
}

async function cachePermission(args: {
  tenantId: string;
  phoneNumberId: string;
  contactPhone: string;
  status: string;
  permissionType: string | null;
  expiresAt: Date | null;
}): Promise<void> {
  const { tenantId, phoneNumberId, contactPhone, status, permissionType, expiresAt } = args;
  await prisma.whatsAppCallPermission.upsert({
    where: { phoneNumberId_contactPhone: { phoneNumberId, contactPhone } },
    update: {
      status, permissionType, expiresAt,
      ...(status === 'granted' ? { revokedAt: null } : {}),
    },
    create: { tenantId, phoneNumberId, contactPhone, status, permissionType, expiresAt, source: 'unknown' },
  });
}

/**
 * Ask a customer for permission to call them.
 *
 * Rate-limited on our side as well as Meta's. Meta would refuse a second
 * request inside 24 hours anyway, but an agent who sees a button, presses it
 * and gets an error has still had a bad time — and the spec asks for the
 * limiting explicitly so agents cannot pester customers.
 */
export async function askForCallPermission(args: {
  tenantId: string;
  phoneNumberId: string;
  token: string;
  contactPhone: string;
  text?: string;
  templateName?: string;
  byUserId?: string | null;
}): Promise<{ ok: boolean; message: string; retryAfter?: Date }> {
  const { tenantId, phoneNumberId, token, contactPhone } = args;

  const existing = await prisma.whatsAppCallPermission.findUnique({
    where: { phoneNumberId_contactPhone: { phoneNumberId, contactPhone } },
  });

  if (existing?.lastRequestedAt) {
    const since = Date.now() - existing.lastRequestedAt.getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    if (since < dayMs) {
      const retryAfter = new Date(existing.lastRequestedAt.getTime() + dayMs);
      return {
        ok: false,
        retryAfter,
        message: 'This customer was already asked today. WhatsApp allows one request a day.',
      };
    }
  }

  const sent = await requestCallPermission(phoneNumberId, token, contactPhone, {
    text: args.text,
    templateName: args.templateName,
  });

  if (!sent.ok) {
    return { ok: false, message: sent.error ?? 'The permission request could not be sent.' };
  }

  await prisma.whatsAppCallPermission.upsert({
    where: { phoneNumberId_contactPhone: { phoneNumberId, contactPhone } },
    update: {
      status: 'pending',
      lastRequestedAt: new Date(),
      requestCount: { increment: 1 },
      requestedByUserId: args.byUserId ?? null,
      source: 'call_permission_request',
    },
    create: {
      tenantId, phoneNumberId, contactPhone,
      status: 'pending',
      lastRequestedAt: new Date(),
      requestCount: 1,
      requestedByUserId: args.byUserId ?? null,
      source: 'call_permission_request',
    },
  });

  return { ok: true, message: 'Permission request sent.' };
}

// ---- Webhook ingestion -----------------------------------------------------

export interface CallIngestResult {
  callsSeen: number;
  callsStored: number;
  permissionsUpdated: number;
  errors: string[];
}

interface CallAccount {
  tenantId: string;
  phoneNumberId: string | null;
}

/**
 * Handle one `calls` webhook change.
 *
 * Meta sends `connect` when a call starts ringing and `terminate` when it ends,
 * for both directions. Everything in between is signalling we initiated. The
 * same call id can arrive more than once (webhook retries), so every write here
 * is keyed on waCallId and is safe to repeat.
 */
export async function handleCallsWebhook(
  value: any,
  account: CallAccount,
  result: CallIngestResult,
): Promise<void> {
  const { tenantId } = account;
  const phoneNumberId: string = value?.metadata?.phone_number_id ?? account.phoneNumberId ?? '';
  const errors: any[] = value?.errors ?? [];

  for (const c of value?.calls ?? []) {
    result.callsSeen += 1;
    try {
      const waCallId: string = c?.id;
      if (!waCallId) { result.errors.push('A call event arrived with no id.'); continue; }

      const userInitiated = String(c?.direction ?? '').toUpperCase() !== 'BUSINESS_INITIATED';
      // On a user-initiated call `from` is the customer; on ours it is our own
      // number, so the customer is whichever end is not us.
      const contactPhone: string = userInitiated ? (c?.from ?? '') : (c?.to ?? '');
      const at = c?.timestamp ? new Date(Number(c.timestamp) * 1000) : new Date();
      const event = String(c?.event ?? '').toLowerCase();

      // Deep links and call buttons are how we learn where a call came from —
      // the website, a QR code on a shelf card, or a template's call action.
      const source = c?.deeplink_payload ? 'deep_link' : c?.cta_payload ? 'call_button' : 'unknown';
      const sourcePayload: string | null = c?.deeplink_payload ?? c?.cta_payload ?? null;

      const conversation = contactPhone
        ? await prisma.conversation.findUnique({
            where: { tenantId_phoneNumberId_contactPhone: { tenantId, phoneNumberId, contactPhone } },
            select: { id: true },
          })
        : null;

      if (event === 'connect') {
        const call = await prisma.whatsAppCall.upsert({
          where: { waCallId },
          update: {
            // A repeat of the same connect must not reopen a call that has
            // already ended; only genuinely new ids start ringing.
            conversationId: conversation?.id ?? undefined,
            source: source !== 'unknown' ? source : undefined,
            sourcePayload: sourcePayload ?? undefined,
          },
          create: {
            tenantId, phoneNumberId, waCallId, contactPhone,
            conversationId: conversation?.id ?? null,
            direction: userInitiated ? 'user_initiated' : 'business_initiated',
            status: 'ringing',
            ringingAt: at,
            source, sourcePayload,
          },
        });
        await recordEvent(call.id, 'inbound', 'connect', c);
        result.callsStored += 1;
        continue;
      }

      if (event === 'terminate') {
        const existing = await prisma.whatsAppCall.findUnique({ where: { waCallId } });
        // Meta's status is COMPLETED or FAILED. A call that never reached
        // `connected` and completed anyway was a call nobody picked up, which
        // to the shop is a missed call, not a finished one.
        const metaStatus = Array.isArray(c?.status) ? String(c.status[0]) : String(c?.status ?? '');
        const failed = metaStatus.toUpperCase() === 'FAILED';
        const wasAnswered = Boolean(existing?.connectedAt) || c?.duration != null;
        const status: CallStatus = failed ? 'failed' : wasAnswered ? 'ended' : 'missed';

        const err = errors[0];
        const startTime = c?.start_time ? new Date(Number(c.start_time) * 1000) : null;
        const endTime = c?.end_time ? new Date(Number(c.end_time) * 1000) : at;

        const call = await prisma.whatsAppCall.upsert({
          where: { waCallId },
          update: {
            status,
            endedAt: endTime,
            connectedAt: existing?.connectedAt ?? startTime,
            // Meta's duration is authoritative; ours is a fallback for the
            // cases where it does not send one.
            durationSec: c?.duration != null ? Number(c.duration)
              : existing?.connectedAt ? Math.round((endTime.getTime() - existing.connectedAt.getTime()) / 1000)
              : null,
            terminateReason: metaStatus || null,
            errorCode: err?.code != null ? String(err.code) : null,
            errorMessage: err?.error_data?.details ?? err?.message ?? null,
          },
          create: {
            tenantId, phoneNumberId, waCallId, contactPhone,
            conversationId: conversation?.id ?? null,
            direction: userInitiated ? 'user_initiated' : 'business_initiated',
            status,
            ringingAt: startTime ?? at,
            connectedAt: startTime,
            endedAt: endTime,
            durationSec: c?.duration != null ? Number(c.duration) : null,
            terminateReason: metaStatus || null,
            errorCode: err?.code != null ? String(err.code) : null,
            errorMessage: err?.error_data?.details ?? err?.message ?? null,
            source, sourcePayload,
          },
        });
        await recordEvent(call.id, 'inbound', 'terminate', { ...c, errors });
        result.callsStored += 1;

        // A missed call is work. It belongs in the thread the customer would
        // see, so the agent who opens that conversation tomorrow knows the
        // phone rang and nobody answered.
        if (status === 'missed' && conversation?.id) {
          await noteMissedCall(conversation.id, contactPhone, endTime, userInitiated);
        }
        continue;
      }

      // Anything else is recorded but not acted on — Meta adds call events
      // over time and dropping one silently would lose the trail.
      const known = await prisma.whatsAppCall.findUnique({ where: { waCallId }, select: { id: true } });
      if (known) await recordEvent(known.id, 'inbound', event || 'status', c);
    } catch (e) {
      result.errors.push(`Call event: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

async function recordEvent(callId: string, origin: string, kind: string, payload: unknown): Promise<void> {
  await prisma.whatsAppCallEvent.create({
    data: { callId, origin, kind, payload: payload as never },
  });
}

/**
 * Put a missed call in the conversation timeline.
 *
 * Written as a system message rather than a note so it sorts with everything
 * else that happened on the thread, which is the only way a timeline reads
 * as what actually happened in order.
 */
async function noteMissedCall(
  conversationId: string,
  contactPhone: string,
  at: Date,
  userInitiated: boolean,
): Promise<void> {
  const text = userInitiated
    ? '📞 Missed WhatsApp call from the customer'
    : '📞 WhatsApp call not answered';
  await prisma.message.create({
    data: {
      conversationId,
      direction: userInitiated ? 'inbound' : 'outbound',
      type: 'call',
      text,
      source: userInitiated ? 'customer' : 'crm_agent',
      at,
    },
  });
  // A missed call from a customer is someone waiting on us exactly as a
  // message would be, so it starts the SLA clock the same way.
  if (userInitiated) {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: at, status: 'open', isHistorical: false },
    });
    // Only if nothing was already waiting: awaitingSince marks the OLDEST
    // unanswered thing, so overwriting it would quietly reset an SLA clock
    // that had been running since this morning.
    await prisma.conversation.updateMany({
      where: { id: conversationId, awaitingSince: null },
      data: { awaitingSince: at },
    });
  }
}

/**
 * A `call_permission_reply` riding in on the messages webhook.
 *
 * This is the only moment we are told a permission was granted, so it is also
 * where the expiry we will later trust is recorded.
 */
export async function handlePermissionReply(args: {
  tenantId: string;
  phoneNumberId: string;
  contactPhone: string;
  reply: any;
}): Promise<boolean> {
  const { tenantId, phoneNumberId, contactPhone, reply } = args;
  const response = String(reply?.response ?? '').toLowerCase();
  if (response !== 'accept' && response !== 'reject') return false;

  const permanent = reply?.is_permanent === true;
  const expiresAt = reply?.expiration_timestamp
    ? new Date(Number(reply.expiration_timestamp) * 1000)
    : null;

  const data = response === 'accept'
    ? {
        status: 'granted',
        permissionType: permanent ? 'permanent' : 'temporary',
        grantedAt: new Date(),
        // A permanent grant has no expiry; a temporary one runs seven days.
        expiresAt: permanent ? null : expiresAt,
        revokedAt: null,
        source: String(reply?.response_source ?? 'user_action'),
      }
    : {
        status: 'denied',
        permissionType: null,
        grantedAt: null,
        expiresAt: null,
        source: String(reply?.response_source ?? 'user_action'),
      };

  await prisma.whatsAppCallPermission.upsert({
    where: { phoneNumberId_contactPhone: { phoneNumberId, contactPhone } },
    update: data,
    create: { tenantId, phoneNumberId, contactPhone, ...data },
  });
  return true;
}

/**
 * Permissions our cache still calls live but whose window has passed.
 *
 * Meta sends no webhook when a temporary permission expires, so without this
 * the inbox would keep offering a Call button that Meta will refuse.
 */
export async function expireStalePermissions(now: Date = new Date()): Promise<number> {
  const r = await prisma.whatsAppCallPermission.updateMany({
    where: { status: 'granted', expiresAt: { not: null, lte: now } },
    data: { status: 'expired', permissionType: null },
  });
  return r.count;
}

// ---- Call deep links (Part 2 doc §5.7) -------------------------------------

/**
 * A link that opens a WhatsApp call to this number.
 *
 * The payload is how a shop tells one entry point from another — the QR card on
 * the counter, the Google listing, the order-support page — and it comes back
 * on the `calls` webhook as `deeplink_payload`. Without it every call is
 * attributed to "unknown" and the shop cannot tell which placement is working.
 *
 * Meta caps the payload, and anything that is not URL-safe will not survive the
 * round trip, so it is normalised here rather than trusted from the caller.
 */
export function callDeepLink(displayPhone: string, payload?: string): string {
  const digits = displayPhone.replace(/[^\d]/g, '');
  const base = `https://wa.me/call/${digits}`;
  if (!payload) return base;
  const safe = payload.trim().replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 64);
  return safe ? `${base}?payload=${encodeURIComponent(safe)}` : base;
}
