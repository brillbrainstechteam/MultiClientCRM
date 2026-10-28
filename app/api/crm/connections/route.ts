import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';
import { listConnections, summarise, PROVIDERS, PROVIDER_LABEL } from '@/lib/crm/connections';

/**
 * Lead Source Connections (Lead Intake Hub). GET returns every connected channel
 * (explicit rows + live WhatsApp numbers) with health; POST registers a new
 * connection. Managing connections is an admin/manager action.
 */
const MANAGER_ROLES = ['owner', 'admin', 'manager'];

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!MANAGER_ROLES.includes(user.role)) return NextResponse.json({ error: 'Only a manager can view connections.' }, { status: 403 });

  const rows = await listConnections(user.tenantId);
  return NextResponse.json({ connections: rows, summary: summarise(rows), providers: PROVIDERS });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!MANAGER_ROLES.includes(user.role)) return NextResponse.json({ error: 'Only a manager can add connections.' }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as {
    provider?: string; displayName?: string; externalAccountId?: string;
    parentConnectionId?: string; enabledSources?: string[]; config?: unknown;
  };
  const provider = typeof b.provider === 'string' ? b.provider.trim() : '';
  if (!provider || !PROVIDER_LABEL[provider]) return NextResponse.json({ error: 'A valid provider is required.' }, { status: 400 });
  const displayName = (typeof b.displayName === 'string' && b.displayName.trim()) || `${PROVIDER_LABEL[provider]}`;

  // Webhook-based sources that need no OAuth (Google Ads lead forms) get an
  // auto-generated per-tenant URL token + verification key to paste into the
  // provider. The source is immediately "connected" (just awaiting its first event).
  const webhookProvider = provider === 'google_ads';
  let externalAccountId = typeof b.externalAccountId === 'string' ? b.externalAccountId.trim() || null : null;
  let config: object | undefined = b.config && typeof b.config === 'object' ? (b.config as object) : undefined;
  if (webhookProvider) {
    externalAccountId = externalAccountId ?? randomBytes(12).toString('base64url');
    config = { ...(config ?? {}), key: randomBytes(12).toString('base64url') };
  }

  const created = await prisma.crmSourceConnection.create({
    data: {
      tenantId: user.tenantId,
      provider,
      displayName,
      externalAccountId,
      parentConnectionId: typeof b.parentConnectionId === 'string' ? b.parentConnectionId.trim() || null : null,
      enabledSources: Array.isArray(b.enabledSources) ? b.enabledSources.filter((s) => typeof s === 'string') : [],
      status: webhookProvider ? 'connected' : 'pending',
      authStatus: webhookProvider ? 'ok' : 'pending',
      ...(config ? { config } : {}),
    },
  });
  await audit({ tenantId: user.tenantId, actorId: user.id, action: 'connection.added', targetType: 'source_connection', targetId: created.id, detail: `${provider}: ${displayName}` });
  return NextResponse.json({ id: created.id }, { status: 201 });
}
