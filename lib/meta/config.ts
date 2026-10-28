/**
 * Meta / WhatsApp Cloud API configuration, read from env.
 *
 * `appId` and `configId` are public (used by the Embedded Signup SDK in the
 * browser). `appSecret` and `webhookVerifyToken` are server-only — they resolve
 * to empty strings in the client bundle because Next only inlines NEXT_PUBLIC_*.
 */
export const metaConfig = {
  appId: process.env.NEXT_PUBLIC_META_APP_ID ?? '',
  configId: process.env.NEXT_PUBLIC_META_CONFIG_ID ?? '',
  // Separate Facebook Login for Business configuration for the Lead Sources
  // connection (Pages + Lead Ads + Instagram) — distinct from the WhatsApp
  // Embedded Signup config above, because its token type, assets and
  // permissions differ. Falls back to configId only if not set.
  leadsConfigId: process.env.NEXT_PUBLIC_META_LEADS_CONFIG_ID ?? '',
  // Graph version for server-to-server calls. Keep this in step with the
  // version your webhook fields are subscribed at in the App Dashboard —
  // payloads arrive shaped by the subscription, not by this.
  graphVersion: process.env.META_GRAPH_VERSION ?? process.env.NEXT_PUBLIC_META_GRAPH_VERSION ?? 'v23.0',
  appSecret: process.env.META_APP_SECRET ?? '',
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? '',
  /** Public base URL of this app (used as an OAuth redirect_uri candidate). */
  appUrl: process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? '',
  /**
   * Embedded Signup "featureType" used to request the Coexistence flow (keep the
   * WhatsApp Business app working). The exact value changes across Meta releases,
   * so it is configurable — confirm the current value in Meta's Embedded Signup
   * docs and set NEXT_PUBLIC_META_COEXISTENCE_FEATURE.
   */
  coexistenceFeature: process.env.NEXT_PUBLIC_META_COEXISTENCE_FEATURE ?? 'whatsapp_business_app_onboarding',
  /**
   * Embedded Signup version — and the default is deliberately the OLD one.
   *
   * The version is a property of the Facebook Login for Business configuration,
   * not of this code: a v4 configuration is one created by selecting products,
   * and Meta shows no version label, so the running configuration's version
   * cannot be detected from here.
   *
   * That makes the risk asymmetric. `sessionInfoVersion` is the v2 field that
   * asks for the session payload, and Meta states a v2 integration **must** send
   * it to receive the callback at all — omit it against a v2 configuration and
   * waba_id / phone_number_id never come back, which breaks onboarding outright.
   * Send it against a v4 configuration and it is simply unnecessary, because v4
   * returns session info regardless.
   *
   * So: keep sending it until the v4 configuration genuinely exists, then set
   * NEXT_PUBLIC_META_ES_VERSION=v4. Config first, flag second.
   */
  embeddedSignupVersion: process.env.NEXT_PUBLIC_META_ES_VERSION ?? 'v2',
  /** Opt into v4-public-preview (the refreshed UI) without changing code. */
  embeddedSignupPreview: process.env.NEXT_PUBLIC_META_ES_PREVIEW === '1',
};

export function graphBase(): string {
  return `https://graph.facebook.com/${metaConfig.graphVersion}`;
}

/** True once the public pieces needed to launch Embedded Signup are present. */
export function isMetaConfigured(): boolean {
  return Boolean(metaConfig.appId && metaConfig.configId);
}
