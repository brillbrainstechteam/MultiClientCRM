import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { audit } from '@/lib/crm/audit';
import { getCallingSettings, updateCallingSettings } from '@/lib/meta/calling-api';
import {
  toMetaSettings, fromMetaSettings, isWithinBusinessHours,
  type DayHours, type Holiday,
} from '@/lib/whatsapp/calling';

/**
 * Settings → WhatsApp → Calling (Part 2 doc §5.1).
 *
 * The SME sees "Customers can call us" and shop hours. Meta sees `status`,
 * `call_icon_visibility`, `callback_permission_status` and
 * `weekly_operating_hours`. This route is the translation, and it is the only
 * place that translation happens.
 *
 * Writes go to Meta first. A row that says calling is on while Meta has it off
 * is worse than a failed save, because the Call button would then be offered
 * and refused.
 */

const ADMIN_ROLES = ['owner', 'admin', 'manager'];

/** Shop hours a jeweller would recognise: Mon–Sat, 10 to 7. */
const DEFAULT_HOURS: DayHours[] = [1, 2, 3, 4, 5, 6].map((day) => ({
  day, open: '10:00', close: '19:00',
}));

async function loadAccount(tenantId: string, phoneNumberId?: string | null) {
  const where = phoneNumberId
    ? { tenantId, phoneNumberId }
    : { tenantId, status: 'connected' };
  return prisma.whatsAppAccount.findFirst({
    where,
    orderBy: { connectedAt: 'desc' },
    select: {
      id: true, phoneNumberId: true, displayPhone: true, verifiedName: true,
      accessToken: true, status: true, messagingTier: true, qualityRating: true,
      codeVerificationStatus: true,
    },
  });
}

function serialize(row: {
  enabled: boolean; callIconVisible: boolean; inboundEnabled: boolean; outboundEnabled: boolean;
  timezone: string; businessHours: unknown; holidays: unknown;
  afterHoursBehaviour: string; afterHoursMessage: string | null;
  recordingEnabled: boolean; recordingConsentText: string | null; recordingRetentionDays: number;
  transcriptionEnabled: boolean; metaCallingStatus: string | null;
  restrictionReason: string | null; callQuality: string | null; syncedAt: Date | null;
}) {
  return {
    enabled: row.enabled,
    callIconVisible: row.callIconVisible,
    inboundEnabled: row.inboundEnabled,
    outboundEnabled: row.outboundEnabled,
    timezone: row.timezone,
    businessHours: (row.businessHours as DayHours[]) ?? [],
    holidays: (row.holidays as Holiday[]) ?? [],
    afterHoursBehaviour: row.afterHoursBehaviour,
    afterHoursMessage: row.afterHoursMessage,
    recordingEnabled: row.recordingEnabled,
    recordingConsentText: row.recordingConsentText,
    recordingRetentionDays: row.recordingRetentionDays,
    transcriptionEnabled: row.transcriptionEnabled,
    metaCallingStatus: row.metaCallingStatus,
    restrictionReason: row.restrictionReason,
    callQuality: row.callQuality,
    syncedAt: row.syncedAt?.toISOString() ?? null,
    openNow: isWithinBusinessHours(row).open,
  };
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const phoneNumberId = new URL(req.url).searchParams.get('phoneNumberId');
  const account = await loadAccount(user.tenantId, phoneNumberId);
  if (!account?.phoneNumberId) {
    return NextResponse.json({ error: 'Connect a WhatsApp number first.' }, { status: 409 });
  }

  let row = await prisma.whatsAppCallingSettings.findUnique({
    where: { phoneNumberId: account.phoneNumberId },
  });

  if (!row) {
    row = await prisma.whatsAppCallingSettings.create({
      data: {
        tenantId: user.tenantId,
        phoneNumberId: account.phoneNumberId,
        // Off until someone turns it on. Calling is a commitment to answer the
        // phone, and a shop that has not said yes has not made it.
        enabled: false,
        businessHours: DEFAULT_HOURS as never,
      },
    });
  }

  return NextResponse.json({
    settings: serialize(row),
    number: {
      phoneNumberId: account.phoneNumberId,
      displayPhone: account.displayPhone,
      verifiedName: account.verifiedName,
    },
  });
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Only an owner, admin or manager can change calling settings.' }, { status: 403 });
  }

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });

  const account = await loadAccount(user.tenantId, b.phoneNumberId as string | undefined);
  if (!account?.phoneNumberId || !account.accessToken) {
    return NextResponse.json({ error: 'Connect a WhatsApp number first.' }, { status: 409 });
  }

  const current = await prisma.whatsAppCallingSettings.findUnique({
    where: { phoneNumberId: account.phoneNumberId },
  });

  const hours = Array.isArray(b.businessHours) ? (b.businessHours as DayHours[]) : undefined;
  const bad = hours?.find((h) =>
    typeof h?.day !== 'number' || h.day < 0 || h.day > 6 ||
    !/^\d{2}:\d{2}$/.test(h?.open ?? '') || !/^\d{2}:\d{2}$/.test(h?.close ?? ''));
  if (bad) return NextResponse.json({ error: 'Business hours must be a day 0–6 with HH:MM open and close times.' }, { status: 400 });
  // Meta rejects a close that does not follow its open, and a day that reads
  // 19:00–10:00 would otherwise silently become "never open".
  const inverted = hours?.find((h) => h.close <= h.open);
  if (inverted) {
    return NextResponse.json({ error: 'A closing time must be later than its opening time.' }, { status: 400 });
  }

  const holidays = Array.isArray(b.holidays) ? (b.holidays as Holiday[]) : undefined;
  if (holidays?.some((h) => !/^\d{4}-\d{2}-\d{2}$/.test(h?.date ?? ''))) {
    return NextResponse.json({ error: 'A holiday needs a date in YYYY-MM-DD form.' }, { status: 400 });
  }
  if (holidays && holidays.length > 20) {
    return NextResponse.json({ error: 'WhatsApp allows up to 20 holiday dates.' }, { status: 400 });
  }

  const next = {
    enabled: typeof b.enabled === 'boolean' ? b.enabled : current?.enabled ?? false,
    callIconVisible: typeof b.callIconVisible === 'boolean' ? b.callIconVisible : current?.callIconVisible ?? true,
    inboundEnabled: typeof b.inboundEnabled === 'boolean' ? b.inboundEnabled : current?.inboundEnabled ?? true,
    outboundEnabled: typeof b.outboundEnabled === 'boolean' ? b.outboundEnabled : current?.outboundEnabled ?? false,
    timezone: typeof b.timezone === 'string' && b.timezone ? b.timezone : current?.timezone ?? 'Asia/Kolkata',
    businessHours: (hours ?? current?.businessHours ?? DEFAULT_HOURS) as never,
    holidays: (holidays ?? current?.holidays ?? []) as never,
    afterHoursBehaviour: typeof b.afterHoursBehaviour === 'string' ? b.afterHoursBehaviour : current?.afterHoursBehaviour ?? 'voicemail',
    afterHoursMessage: typeof b.afterHoursMessage === 'string' ? b.afterHoursMessage : current?.afterHoursMessage ?? null,
    recordingEnabled: typeof b.recordingEnabled === 'boolean' ? b.recordingEnabled : current?.recordingEnabled ?? false,
    recordingConsentText: typeof b.recordingConsentText === 'string' ? b.recordingConsentText : current?.recordingConsentText ?? null,
    recordingRetentionDays: typeof b.recordingRetentionDays === 'number' ? b.recordingRetentionDays : current?.recordingRetentionDays ?? 90,
    transcriptionEnabled: typeof b.transcriptionEnabled === 'boolean' ? b.transcriptionEnabled : current?.transcriptionEnabled ?? false,
  };

  // Recording without a consent line is a legal problem, not a UX one. The
  // spec asks for recording off by default until consent is configured, and
  // this is the enforcement rather than a note in the UI.
  if (next.recordingEnabled && !next.recordingConsentText?.trim()) {
    return NextResponse.json(
      { error: 'Add the announcement customers will hear before you can switch recording on.' },
      { status: 400 },
    );
  }

  const token = decrypt(account.accessToken);
  const pushed = await updateCallingSettings(account.phoneNumberId, token, toMetaSettings(next));
  if (!pushed.ok) {
    // Saving locally anyway would leave the UI claiming something WhatsApp has
    // not agreed to.
    return NextResponse.json(
      { error: `WhatsApp did not accept the change: ${pushed.error}` },
      { status: 502 },
    );
  }

  const saved = await prisma.whatsAppCallingSettings.upsert({
    where: { phoneNumberId: account.phoneNumberId },
    update: { ...next, syncedAt: new Date() },
    create: { tenantId: user.tenantId, phoneNumberId: account.phoneNumberId, ...next, syncedAt: new Date() },
  });

  await audit({
    tenantId: user.tenantId, actorId: user.id, action: 'whatsapp.calling.settings_updated',
    targetType: 'whatsapp_number', targetId: account.phoneNumberId,
    detail: `calling ${next.enabled ? 'on' : 'off'}, inbound ${next.inboundEnabled ? 'on' : 'off'}, outbound ${next.outboundEnabled ? 'on' : 'off'}`,
  });

  return NextResponse.json({ settings: serialize(saved) });
}

/** Pull Meta's view of this number's calling configuration back over ours. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Only an owner, admin or manager can sync calling settings.' }, { status: 403 });
  }

  const b = (await req.json().catch(() => ({}))) as { phoneNumberId?: string };
  const account = await loadAccount(user.tenantId, b.phoneNumberId);
  if (!account?.phoneNumberId || !account.accessToken) {
    return NextResponse.json({ error: 'Connect a WhatsApp number first.' }, { status: 409 });
  }

  const token = decrypt(account.accessToken);
  const live = await getCallingSettings(account.phoneNumberId, token);
  if (!live.ok || !live.data) {
    return NextResponse.json({ error: live.error ?? 'WhatsApp did not return calling settings.' }, { status: 502 });
  }

  const mapped = fromMetaSettings(live.data);
  const saved = await prisma.whatsAppCallingSettings.upsert({
    where: { phoneNumberId: account.phoneNumberId },
    update: {
      metaCallingStatus: mapped.metaCallingStatus,
      callIconVisible: mapped.callIconVisible,
      outboundEnabled: mapped.outboundEnabled,
      enabled: mapped.metaCallingStatus === 'ENABLED',
      ...(mapped.timezone ? { timezone: mapped.timezone } : {}),
      businessHours: mapped.businessHours as never,
      holidays: mapped.holidays as never,
      syncedAt: new Date(),
    },
    create: {
      tenantId: user.tenantId,
      phoneNumberId: account.phoneNumberId,
      enabled: mapped.metaCallingStatus === 'ENABLED',
      metaCallingStatus: mapped.metaCallingStatus,
      callIconVisible: mapped.callIconVisible,
      outboundEnabled: mapped.outboundEnabled,
      timezone: mapped.timezone ?? 'Asia/Kolkata',
      businessHours: mapped.businessHours as never,
      holidays: mapped.holidays as never,
      syncedAt: new Date(),
    },
  });

  return NextResponse.json({ settings: serialize(saved) });
}
