import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { computeCapabilities } from '@/lib/meta/capabilities';

/**
 * Capability Registry (doc §2.2) — "what can this number do?" for the tenant.
 * The UI reads this to gate features instead of hard-coding them.
 *
 * Returns the primary (connected) number's capabilities plus a per-number list.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const accounts = await prisma.whatsAppAccount.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { connectedAt: 'desc' },
    select: { id: true, label: true, displayPhone: true, status: true, qualityRating: true, messagingTier: true, codeVerificationStatus: true },
  });

  const numbers = accounts.map((a) => ({
    id: a.id,
    label: a.label ?? a.displayPhone ?? 'WhatsApp number',
    displayPhone: a.displayPhone,
    ...computeCapabilities(a),
  }));

  const primary = numbers.find((n) => n.facts.connected) ?? numbers[0] ?? null;

  return NextResponse.json({
    connected: Boolean(primary?.facts.connected),
    primary: primary ? { facts: primary.facts, capabilities: primary.capabilities } : null,
    numbers,
  });
}
