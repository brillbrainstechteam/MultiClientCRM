/**
 * Capability Registry (Part 1 doc §2.2).
 *
 * One place that answers "what can THIS connected number actually do?", computed
 * from what we know about the account (connection, quality, messaging tier,
 * country, verification). The UI asks the registry instead of hard-coding which
 * SME gets Calling / Groups / Catalogue / marketing broadcast, because those are
 * gated by Meta on account / region / limit / approval.
 *
 * Each capability is { available, reason? } so the UI can both gate the feature
 * AND explain why it's off. Where we genuinely can't know yet (e.g. Official
 * Business Account status, Meta-catalog connection), we return `available:false`
 * with an honest reason rather than guessing true.
 */

export interface Capability {
  available: boolean;
  /** Plain-language reason when unavailable, or a note when available. */
  reason?: string;
}

export interface CapabilitySet {
  messaging: Capability;
  templates: Capability;
  authentication: Capability;
  marketingBroadcast: Capability;
  calling: Capability;
  businessInitiatedCalling: Capability;
  groups: Capability;
  catalogue: Capability;
}

export interface CapabilityFacts {
  connected: boolean;
  country: string | null;        // dialing region we could infer, e.g. "+91"
  quality: string | null;        // GREEN | YELLOW | RED | UNKNOWN
  messagingTier: string | null;  // TIER_250 | TIER_1K | ...
  dailyLimit: number | null;     // unique recipients / 24h implied by the tier
  verified: boolean;
}

export interface AccountCapabilityView {
  facts: CapabilityFacts;
  capabilities: CapabilitySet;
}

/** Minimal shape we read — matches WhatsAppAccount columns. */
export interface CapabilityInput {
  status: string | null;
  displayPhone: string | null;
  qualityRating: string | null;
  messagingTier: string | null;
  codeVerificationStatus: string | null;
}

// Tier → implied daily unique-recipient limit.
const TIER_LIMIT: Record<string, number> = {
  TIER_50: 50, TIER_250: 250, TIER_1K: 1000, TIER_2K: 2000,
  TIER_10K: 10000, TIER_100K: 100000, UNLIMITED: Number.POSITIVE_INFINITY, TIER_UNLIMITED: Number.POSITIVE_INFINITY,
};

// Business-initiated calling is not offered when the BUSINESS number is in these
// countries (calling overview). Keyed by dialing prefix.
const BIZ_CALL_BLOCKED_PREFIXES = ['+1', '+20', '+84', '+234']; // US/CA, EG, VN, NG

function dialPrefix(displayPhone: string | null): string | null {
  if (!displayPhone) return null;
  const m = displayPhone.replace(/[^\d+]/g, '').match(/^\+(\d{1,3})/);
  return m ? `+${m[1]}` : null;
}

export function computeCapabilities(a: CapabilityInput): AccountCapabilityView {
  const connected = a.status === 'connected';
  const prefix = dialPrefix(a.displayPhone);
  const quality = a.qualityRating ?? null;
  const tier = a.messagingTier ?? null;
  const dailyLimit = tier && tier in TIER_LIMIT ? TIER_LIMIT[tier] : null;
  const verified = a.codeVerificationStatus === 'VERIFIED';

  const facts: CapabilityFacts = { connected, country: prefix, quality, messagingTier: tier, dailyLimit, verified };

  const off = (reason: string): Capability => ({ available: false, reason });
  if (!connected) {
    const notConnected = off('Connect this WhatsApp number first.');
    return {
      facts,
      capabilities: {
        messaging: notConnected, templates: notConnected, authentication: notConnected,
        marketingBroadcast: notConnected, calling: notConnected, businessInitiatedCalling: notConnected,
        groups: notConnected, catalogue: notConnected,
      },
    };
  }

  // Calling needs a daily limit of at least 2,000 unique recipients.
  const callingOk = dailyLimit != null && dailyLimit >= 2000;
  const calling: Capability = callingOk
    ? { available: true }
    : off(dailyLimit != null ? `Needs a daily limit of 2,000+ (currently ${dailyLimit.toLocaleString('en-IN')}).` : 'Needs a daily limit of 2,000+ — not known yet.');

  // Business-initiated calling: calling enabled AND business number not in a blocked region.
  const bizCallBlocked = prefix != null && BIZ_CALL_BLOCKED_PREFIXES.includes(prefix);
  const businessInitiatedCalling: Capability = !callingOk
    ? off('Enable calling first.')
    : bizCallBlocked
      ? off(`Not available for business numbers in ${prefix}.`)
      : { available: true };

  // Marketing broadcast: available, except WhatsApp doesn't deliver marketing to US (+1 US) numbers.
  const marketingBroadcast: Capability = { available: true, reason: prefix === '+1' ? 'Marketing templates are not delivered to US numbers.' : undefined };

  return {
    facts,
    capabilities: {
      messaging: { available: true },
      templates: { available: true },
      authentication: { available: true },
      marketingBroadcast,
      calling,
      businessInitiatedCalling,
      // We don't track Official Business Account status yet; Groups needs it.
      groups: off('Requires an Official Business Account (not detected).'),
      // Local catalogue exists, but a Meta-connected product catalog isn't wired yet.
      catalogue: off('A Meta product catalog is not connected yet.'),
    },
  };
}
