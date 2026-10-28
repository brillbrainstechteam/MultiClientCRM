import { prisma } from '@/lib/db';

/**
 * Lead Source Connections (Lead Intake Hub — Source Connections + Connector
 * Monitoring). The registry of every channel/account a tenant can receive
 * enquiries on, and the health the admin must be able to see so a dead
 * connector never looks fine.
 *
 * Multi-account is first-class: a tenant may hold many WhatsApp numbers, many
 * Facebook Pages and many Instagram accounts. WhatsApp numbers already live in
 * `WhatsAppAccount`; we surface them here (read-only) alongside the explicit
 * `CrmSourceConnection` rows so the admin sees one unified list.
 */

export type ConnectionStatus = 'connected' | 'degraded' | 'disconnected' | 'pending';

export interface ProviderDef {
  provider: string;
  label: string;
  /** Can a tenant hold several of these? (drives the "Add another" affordance) */
  multi: boolean;
  /** How a lead from this provider is captured today. */
  how: 'live' | 'webhook' | 'manual' | 'import';
}

export const PROVIDERS: ProviderDef[] = [
  { provider: 'whatsapp', label: 'WhatsApp', multi: true, how: 'live' },
  { provider: 'facebook', label: 'Facebook Page', multi: true, how: 'webhook' },
  { provider: 'instagram', label: 'Instagram', multi: true, how: 'webhook' },
  { provider: 'meta', label: 'Meta Business', multi: true, how: 'webhook' },
  { provider: 'messenger', label: 'Messenger', multi: true, how: 'webhook' },
  { provider: 'meta_lead_ad', label: 'Meta Lead Ads', multi: true, how: 'webhook' },
  { provider: 'website_form', label: 'Website form', multi: true, how: 'webhook' },
  { provider: 'website_chat', label: 'Website chat', multi: true, how: 'webhook' },
  { provider: 'google_ads', label: 'Google Ads lead forms', multi: true, how: 'webhook' },
  { provider: 'exhibition', label: 'Exhibitions', multi: true, how: 'import' },
  { provider: 'telecalling', label: 'Telecalling lists', multi: true, how: 'import' },
  { provider: 'card2leads', label: 'Card2Leads', multi: true, how: 'import' },
  { provider: 'erp_pos', label: 'ERP / POS', multi: true, how: 'import' },
  { provider: 'ecommerce', label: 'Ecommerce', multi: true, how: 'webhook' },
  { provider: 'referral', label: 'Referrals', multi: true, how: 'manual' },
];

export const PROVIDER_LABEL: Record<string, string> = Object.fromEntries(PROVIDERS.map((p) => [p.provider, p.label]));

export interface ConnectionRow {
  id: string;
  provider: string;
  providerLabel: string;
  displayName: string;
  externalAccountId: string | null;
  parentConnectionId: string | null;
  status: ConnectionStatus;
  authStatus: string;
  lastEventAt: string | null;
  lastError: string | null;
  active: boolean;
  /** true for rows synthesised from WhatsAppAccount — managed on the WhatsApp screen, not editable here. */
  derived: boolean;
  /** For webhook sources (Google Ads): the ingest path + key to paste into the provider. */
  ingestPath?: string;
  secretKey?: string;
}

/** Map a WhatsAppAccount's status to the unified connection health. */
function waStatus(s: string | null): { status: ConnectionStatus; authStatus: string } {
  switch (s) {
    case 'connected': return { status: 'connected', authStatus: 'ok' };
    case 'reconnect_required': return { status: 'degraded', authStatus: 'expired' };
    case 'disconnected': return { status: 'disconnected', authStatus: 'revoked' };
    case 'error': return { status: 'degraded', authStatus: 'error' };
    default: return { status: 'pending', authStatus: 'pending' };
  }
}

/** The full unified list: explicit connections + WhatsApp numbers, with health. */
export async function listConnections(tenantId: string): Promise<ConnectionRow[]> {
  const [rows, waAccounts] = await Promise.all([
    prisma.crmSourceConnection.findMany({ where: { tenantId }, orderBy: [{ provider: 'asc' }, { createdAt: 'asc' }] }),
    prisma.whatsAppAccount.findMany({ where: { tenantId }, select: { id: true, label: true, displayPhone: true, phoneNumberId: true, status: true, statusReason: true, tokenExpiresAt: true, connectedAt: true } }),
  ]);

  const explicit: ConnectionRow[] = rows.map((r) => {
    const cfg = (r.config ?? null) as { key?: string } | null;
    return {
      id: r.id,
      provider: r.provider,
      providerLabel: PROVIDER_LABEL[r.provider] ?? r.provider,
      displayName: r.displayName,
      externalAccountId: r.externalAccountId,
      parentConnectionId: r.parentConnectionId,
      status: r.status as ConnectionStatus,
      authStatus: r.authStatus,
      lastEventAt: r.lastEventAt ? r.lastEventAt.toISOString() : null,
      lastError: r.lastError,
      active: r.active,
      derived: false,
      ...(r.provider === 'google_ads' && r.externalAccountId
        ? { ingestPath: `/api/public/google-lead/${r.externalAccountId}`, secretKey: cfg?.key }
        : {}),
    };
  });

  // WhatsApp numbers are managed on the WhatsApp screen; show them here read-only
  // so the admin sees every live channel in one place.
  const derived: ConnectionRow[] = waAccounts.map((w) => {
    const h = waStatus(w.status);
    return {
      id: `wa:${w.id}`,
      provider: 'whatsapp',
      providerLabel: 'WhatsApp',
      displayName: w.label || w.displayPhone || 'WhatsApp number',
      externalAccountId: w.phoneNumberId ?? null,
      parentConnectionId: null,
      status: h.status,
      authStatus: h.authStatus,
      lastEventAt: w.connectedAt ? w.connectedAt.toISOString() : null,
      lastError: w.statusReason ?? null,
      active: w.status === 'connected',
      derived: true,
    };
  });

  return [...derived, ...explicit];
}

/**
 * Record that a connector just processed (or failed to process) an event. Keeps
 * lastEventAt / lastError / status current so monitoring reflects reality.
 */
export async function markConnectionEvent(input: {
  tenantId: string;
  connectionId?: string | null;
  provider?: string | null;
  externalAccountId?: string | null;
  ok: boolean;
  error?: string | null;
}): Promise<void> {
  const where = input.connectionId
    ? { id: input.connectionId }
    : input.provider && input.externalAccountId
      ? { tenantId: input.tenantId, provider: input.provider, externalAccountId: input.externalAccountId }
      : null;
  if (!where) return;

  const conn = await prisma.crmSourceConnection.findFirst({ where });
  if (!conn) return;
  await prisma.crmSourceConnection.update({
    where: { id: conn.id },
    data: input.ok
      ? { lastEventAt: new Date(), lastError: null, status: conn.active ? 'connected' : conn.status, authStatus: 'ok' }
      : { lastError: input.error ?? 'Processing error', status: 'degraded' },
  });
}

export interface HealthSummary { total: number; connected: number; degraded: number; disconnected: number; pending: number }

export function summarise(rows: ConnectionRow[]): HealthSummary {
  const s: HealthSummary = { total: rows.length, connected: 0, degraded: 0, disconnected: 0, pending: 0 };
  for (const r of rows) s[r.status] += 1;
  return s;
}
