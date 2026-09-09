import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

const digits = (s: string) => (s ?? '').replace(/\D/g, '');

/** List the tenant's call logs (optionally filtered by contact). */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const contactId = new URL(req.url).searchParams.get('contactId') ?? undefined;

  const calls = await prisma.crmCallLog.findMany({
    where: { tenantId: user.tenantId, ...(contactId ? { contactId } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return NextResponse.json({
    calls: calls.map((c) => ({
      id: c.id, contactId: c.contactId, mobile: c.mobile, direction: c.direction,
      provider: c.provider, providerCallId: c.providerCallId, status: c.status,
      startedAt: c.startedAt ? c.startedAt.toISOString() : null, durationSec: c.durationSec,
      recordingUrl: c.recordingUrl, transcript: c.transcript, summary: c.summary,
      disposition: c.disposition, byUserId: c.byUserId, createdAt: c.createdAt.toISOString(),
    })),
  });
}

/**
 * Log a call outcome (agent-logged now; provider-driven once telephony is
 * connected). When a provider is connected, this is also the click-to-call
 * entry point — the provider adapter dials, then updates the log via webhook.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const mobile = typeof b?.mobile === 'string' ? b.mobile : '';
  if (!digits(mobile)) return NextResponse.json({ error: 'A phone number is required.' }, { status: 400 });

  const call = await prisma.crmCallLog.create({
    data: {
      tenantId: user.tenantId,
      contactId: typeof b?.contactId === 'string' ? b.contactId : null,
      mobile,
      direction: b?.direction === 'inbound' ? 'inbound' : 'outbound',
      status: typeof b?.status === 'string' ? (b.status as string) : 'completed',
      durationSec: typeof b?.durationSec === 'number' ? b.durationSec : null,
      disposition: typeof b?.disposition === 'string' ? b.disposition : null,
      summary: typeof b?.summary === 'string' ? b.summary : null,
      byUserId: user.id,
      startedAt: new Date(),
    },
  });
  return NextResponse.json({ id: call.id });
}
