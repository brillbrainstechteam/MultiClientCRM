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
  graphVersion: process.env.META_GRAPH_VERSION ?? process.env.NEXT_PUBLIC_META_GRAPH_VERSION ?? 'v21.0',
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
};

export function graphBase(): string {
  return `https://graph.facebook.com/${metaConfig.graphVersion}`;
}

/** True once the public pieces needed to launch Embedded Signup are present. */
export function isMetaConfigured(): boolean {
  return Boolean(metaConfig.appId && metaConfig.configId);
}
