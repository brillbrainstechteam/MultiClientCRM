import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

/** BYOT telephony connection status for the tenant. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const conn = await prisma.crmTelephonyConnection.findUnique({ where: { tenantId: user.tenantId } });
  return NextResponse.json({
    connected: conn?.status === 'connected',
    provider: conn?.provider ?? null,
    status: conn?.status ?? 'disconnected',
  });
}

/**
 * Connect / update the tenant's telephony provider (BYOT). Provider config
 * (credentials) is supplied once the client is onboarded to their telephony
 * platform; until then the connection is stored as 'pending'. Config is not
 * echoed back.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { provider?: string; config?: unknown } | null;
  const provider = typeof b?.provider === 'string' ? b.provider : '';
  if (!provider) return NextResponse.json({ error: 'Provider is required.' }, { status: 400 });

  const hasConfig = b?.config != null && typeof b.config === 'object';
  const conn = await prisma.crmTelephonyConnection.upsert({
    where: { tenantId: user.tenantId },
    create: { tenantId: user.tenantId, provider, config: (b?.config ?? undefined) as never, status: hasConfig ? 'connected' : 'pending', connectedByUserId: user.id },
    update: { provider, ...(hasConfig ? { config: b!.config as never, status: 'connected' } : {}) },
  });
  return NextResponse.json({ connected: conn.status === 'connected', provider: conn.provider, status: conn.status });
}
