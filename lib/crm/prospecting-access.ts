/**
 * Gate for the B2B-only business-discovery feature (Find New Businesses).
 * Enforced server-side so a B2C tenant can't trigger it even via direct API.
 *
 * Enabled when:
 *  - the tenant's business model is b2b or both (never b2c); AND
 *  - the feature is configured — a Places key (Google search) and/or a Gemini
 *    key (AI discovery) is present on the server.
 *
 * A specific-tenant allowlist (PROSPECTING_TENANTS) is still honoured if set, so
 * the feature can be scoped to named tenants when desired; empty = all B2B.
 */
export function prospectingAllowed(tenant: { id: string; businessModel: string }): boolean {
  const isB2B = tenant.businessModel === 'b2b' || tenant.businessModel === 'both';
  const configured = Boolean(process.env.PLACES_API_KEY || process.env.GEMINI_API_KEY);
  const allow = (process.env.PROSPECTING_TENANTS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const entitled = allow.length === 0 || allow.includes(tenant.id);
  return isB2B && configured && entitled;
}
