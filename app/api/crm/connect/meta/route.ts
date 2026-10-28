import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';
import { metaConfig, isMetaConfigured } from '@/lib/meta/config';
import { encryptSecret } from '@/lib/crypto/secrets';
import { exchangeCodeForToken, getClientBusinessId, listPages, subscribePage } from '@/lib/meta/connect';

/**
 * Meta connection (Facebook Login for Business). The browser runs the SDK with
 * our config_id and returns an auth code; this exchanges it for a delegated
 * Business Integration System User token, discovers the client's Pages +
 * Instagram accounts, stores them as Source Connections (+ encrypted tokens),
 * and subscribes each Page to the Lead Ads / Messenger webhook.
 *
 * Dev-ready: works against a dev app now; serves real client assets once the
 * app has Advanced Access (App Review + Business Verification).
 */
const MANAGER_ROLES = ['owner', 'admin', 'manager'];

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  return NextResponse.json({ configured: isMetaConfigured(), appId: metaConfig.appId, configId: metaConfig.configId });
}

async function upsertConnection(tenantId: string, provider: string, externalAccountId: string, displayName: string, parentConnectionId: string | null) {
  const existing = await prisma.crmSourceConnection.findFirst({ where: { tenantId, provider, externalAccountId } });
  if (existing) {
    return prisma.crmSourceConnection.update({ where: { id: existing.id }, data: { displayName, status: 'connected', authStatus: 'ok', active: true, lastError: null, parentConnectionId: parentConnectionId ?? existing.parentConnectionId } });
  }
  return prisma.crmSourceConnection.create({ data: { tenantId, provider, externalAccountId, displayName, status: 'connected', authStatus: 'ok', parentConnectionId, enabledSources: [] } });
}

async function storeToken(tenantId: string, provider: string, externalId: string | null, connectionId: string | null, token: string, tokenType: string, businessId: string | null, expiresIn: number | null) {
  const accessTokenEnc = encryptSecret(token);
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
  const existing = await prisma.crmOAuthCredential.findFirst({ where: { tenantId, provider, externalId } });
  if (existing) {
    await prisma.crmOAuthCredential.update({ where: { id: existing.id }, data: { accessTokenEnc, tokenType, connectionId, businessId, expiresAt, lastRefreshedAt: new Date() } });
  } else {
    await prisma.crmOAuthCredential.create({ data: { tenantId, provider, externalId, connectionId, accessTokenEnc, tokenType, businessId, expiresAt, scopes: [] } });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!MANAGER_ROLES.includes(user.role)) return NextResponse.json({ error: 'Only a manager can connect Meta.' }, { status: 403 });
  if (!isMetaConfigured()) return NextResponse.json({ error: 'Meta app is not configured on the server yet.' }, { status: 400 });

  const b = (await req.json().catch(() => ({}))) as { code?: string };
  if (!b.code) return NextResponse.json({ error: 'Missing authorization code.' }, { status: 400 });

  const tenantId = user.tenantId;
  try {
    // 1) Code → delegated token.
    const { accessToken, expiresIn } = await exchangeCodeForToken(b.code);
    if (!accessToken) return NextResponse.json({ error: 'Meta did not return an access token.' }, { status: 502 });
    const businessId = await getClientBusinessId(accessToken);

    // 2) Parent "Meta Business" connection + the delegated token.
    const parent = await upsertConnection(tenantId, 'meta', businessId ?? `meta_${tenantId}`, 'Meta Business', null);
    await storeToken(tenantId, 'meta', businessId ?? parent.id, parent.id, accessToken, 'bisu', businessId, expiresIn);

    // 3) Discover Pages + Instagram; store, subscribe, keep page tokens.
    const pages = await listPages(accessToken);
    let igCount = 0;
    const warnings: string[] = [];
    for (const p of pages) {
      const conn = await upsertConnection(tenantId, 'facebook', p.id, p.name, parent.id);
      if (p.accessToken) await storeToken(tenantId, 'facebook_page', p.id, conn.id, p.accessToken, 'page', businessId, null);
      try {
        if (p.accessToken) await subscribePage(p.id, p.accessToken);
      } catch (e) {
        warnings.push(`${p.name}: ${e instanceof Error ? e.message : 'could not subscribe'}`);
        await prisma.crmSourceConnection.update({ where: { id: conn.id }, data: { status: 'degraded', lastError: e instanceof Error ? e.message : 'subscribe failed' } });
      }
      if (p.instagram) {
        igCount += 1;
        await upsertConnection(tenantId, 'instagram', p.instagram.id, p.instagram.username ? `@${p.instagram.username}` : 'Instagram account', parent.id);
      }
    }

    await audit({ tenantId, actorId: user.id, action: 'connection.meta_connected', targetType: 'source_connection', targetId: parent.id, detail: `${pages.length} page(s), ${igCount} Instagram` });
    return NextResponse.json({ ok: true, pages: pages.length, instagram: igCount, warnings });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Meta connection failed.' }, { status: 502 });
  }
}
