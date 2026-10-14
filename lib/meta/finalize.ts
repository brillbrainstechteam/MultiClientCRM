import { prisma } from '@/lib/db';
import { checkLimit } from '@/lib/billing/limits';
import { startCoexistenceSync } from '@/lib/whatsapp/coexistence';
import { encrypt } from '@/lib/crypto';
import {
  getPhoneNumbers, getPhoneNumberHealth, registerPhoneNumber, subscribeAppToWaba,
} from '@/lib/meta/graph';

export interface FinalizeInput {
  tenantId: string;
  businessName: string;
  token: string;
  wabaId: string | null;
  phoneNumberId?: string | null;
  /** FINISH_ONLY_WABA / coexistence: number stays in the Business app — skip register. */
  coexistence: boolean;
  /** Number is already registered (e.g. manual System-User token connect) — skip /register. */
  skipRegister?: boolean;
  /** Resolved from the Embedded Signup finish event (see embedded-signup.ts). */
  connectionMode?: string;
  /** The customer's business portfolio id, for support and asset lookup. */
  businessId?: string | null;
  strategy?: string | null;
}

export interface FinalizeResult {
  phoneNumberId: string | null;
  /** Existing number already has a 2-step PIN — ask the client to enter it. */
  pinRequired: boolean;
}

function newPin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Complete a connection after the token is obtained (by either the JS-SDK popup
 * exchange or the server-redirect exchange): subscribe our app to the WABA,
 * resolve the number + live health, register it for Cloud API sending (auto-PIN
 * for new numbers, skipped for coexistence, surfaced when the client owns the
 * PIN), store it on the tenant, and advance the onboarding session.
 */
export async function finalizeConnection(input: FinalizeInput): Promise<FinalizeResult> {
  const { tenantId, businessName, token, coexistence } = input;
  let wabaId = input.wabaId;
  let phoneNumberId = input.phoneNumberId ?? null;
  let displayPhone: string | null = null;
  let verifiedName: string | null = null;
  let qualityRating: string | null = null;
  let messagingTier: string | null = null;
  let codeVerificationStatus: string | null = null;

  if (wabaId) {
    await subscribeAppToWaba(wabaId, token).catch(() => undefined);
    const phones = await getPhoneNumbers(wabaId, token).catch(() => []);
    const match = phones.find((p) => !phoneNumberId || p.id === phoneNumberId) ?? phones[0];
    if (match) {
      phoneNumberId = match.id;
      displayPhone = match.display_phone_number;
      verifiedName = match.verified_name;
    }
  }

  if (phoneNumberId) {
    const health = await getPhoneNumberHealth(phoneNumberId, token).catch(() => null);
    if (health) {
      displayPhone = health.displayPhone ?? displayPhone;
      verifiedName = health.verifiedName ?? verifiedName;
      qualityRating = health.qualityRating;
      messagingTier = health.messagingTier;
      codeVerificationStatus = health.codeVerificationStatus;
    }
  }

  let storedPin: string | null = null;
  let pinRequired = false;
  let registerNote: string | null = null;
  if (!coexistence && !input.skipRegister && phoneNumberId) {
    const pin = newPin();
    const reg = await registerPhoneNumber(phoneNumberId, token, pin);
    if (reg.ok) storedPin = pin;
    else if (reg.pinRequired) { pinRequired = true; registerNote = 'registration_pending_pin'; }
    else registerNote = `register_failed: ${reg.error ?? 'unknown'}`;
  }

  const data = {
    wabaId,
    phoneNumberId,
    displayPhone,
    verifiedName,
    brand: businessName,
    label: verifiedName ?? businessName,
    department: 'Sales',
    qualityRating: qualityRating ?? 'UNKNOWN',
    messagingTier,
    codeVerificationStatus,
    qualitySyncedAt: new Date(),
    accessToken: encrypt(token),
    ...(storedPin ? { twoStepPin: encrypt(storedPin) } : {}),
    status: 'connected',
    statusReason: registerNote,
    connectedAt: new Date(),
  };

  // How the number arrived decides what we may ask Meta for, and what we are
  // allowed to tell the customer about their old chats.
  // The caller derives this from Meta's finish event, which is authoritative;
  // the strategy the customer picked is only the fallback.
  const connectionMode = input.connectionMode
    ?? (coexistence
      ? 'coexistence'
      : input.strategy === 'existing' ? 'migrated_from_bsp' : 'new_cloud_api');

  const existing = phoneNumberId
    ? await prisma.whatsAppAccount.findFirst({ where: { tenantId, phoneNumberId } })
    : null;

  // Reconnecting a number already on the account is always allowed; only a NEW
  // number counts against the plan, and the check happens before anything is
  // written so a blocked connection leaves no half-made account row.
  if (!existing) {
    const cap = await checkLimit(tenantId, 'numbers');
    if (!cap.allowed) throw new Error(cap.reason ?? 'Your plan does not include another WhatsApp number.');
  }
  let accountId: string;
  if (existing) {
    await prisma.whatsAppAccount.update({
      where: { id: existing.id },
      // onboardedAt is day 0 for Meta's 24-hour sync window — set once.
      data: { ...data, connectionMode, onboardedAt: existing.onboardedAt ?? new Date() },
    });
    accountId = existing.id;
  } else {
    const created = await prisma.whatsAppAccount.create({
      data: { tenantId, ...data, connectionMode, onboardedAt: new Date() },
    });
    accountId = created.id;
  }

  // Coexistence: ask for contacts and history NOW.
  //
  // Meta allows each request once, inside 24 hours of onboarding, and the only
  // recovery is offboarding and repeating Embedded Signup. A button in Settings
  // that the owner might find next week would therefore cost them their history
  // outright — so this fires automatically and never blocks the connection.
  if (coexistence && accountId) {
    void startCoexistenceSync(accountId).catch(() => { /* state records the failure */ });
  }

  await prisma.onboardingSession
    .upsert({
      where: { tenantId },
      create: { tenantId, status: pinRequired ? 'registering' : 'ready', strategy: input.strategy ?? (coexistence ? 'coexistence' : null), wabaId, phoneNumberId },
      update: { status: pinRequired ? 'registering' : 'ready', wabaId, phoneNumberId },
    })
    .catch(() => undefined);

  return { phoneNumberId, pinRequired };
}
