/**
 * Gate for the paid, B2B-only Maps prospecting feature. Enforced server-side
 * so it can't be triggered by an unentitled or B2C tenant even via direct API.
 *
 * Two conditions:
 *  - tenant Business model must be b2b or both (never b2c);
 *  - tenant must be entitled — its id listed in PROSPECTING_TENANTS (comma-
 *    separated). This is the "paid/locked" switch: add a tenant to unlock.
 */
export function prospectingAllowed(tenant: { id: string; businessModel: string }): boolean {
  const isB2B = tenant.businessModel === 'b2b' || tenant.businessModel === 'both';
  const allow = (process.env.PROSPECTING_TENANTS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return isB2B && allow.includes(tenant.id);
}
