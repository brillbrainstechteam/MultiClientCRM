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
   * Embedded Signup version. v2 is deprecated by Meta on 15 October 2026, so v4
   * is the default; the env var exists only so a rollback needs no deploy.
   *
   * v4 selects itself from the Facebook Login for Business configuration — the
   * products are chosen there — and returns session info for every flow. v2 and
   * v3 instead had to ask for it with `sessionInfoVersion`, which is precisely
   * what pins an integration to the retired version.
   */
  embeddedSignupVersion: process.env.NEXT_PUBLIC_META_ES_VERSION ?? 'v4',
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
