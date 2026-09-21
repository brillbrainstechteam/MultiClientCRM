import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { getPhoneNumberHealth } from '@/lib/meta/graph';

/** Refresh a number's live quality / messaging tier / verification from Meta. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await ctx.params;
  const a = await prisma.whatsAppAccount.findUnique({ where: { id } });
  if (!a || a.tenantId !== user.tenantId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  if (!a.phoneNumberId || !a.accessToken) {
    return NextResponse.json({ error: 'This number has no live connection to refresh.' }, { status: 400 });
  }

  const health = await getPhoneNumberHealth(a.phoneNumberId, decrypt(a.accessToken)).catch(() => null);
  if (!health) return NextResponse.json({ error: 'Meta did not return health for this number.' }, { status: 502 });

  const updated = await prisma.whatsAppAccount.update({
    where: { id },
    data: {
      displayPhone: health.displayPhone ?? a.displayPhone,
      verifiedName: health.verifiedName ?? a.verifiedName,
      qualityRating: health.qualityRating ?? a.qualityRating,
      messagingTier: health.messagingTier ?? a.messagingTier,
      codeVerificationStatus: health.codeVerificationStatus ?? a.codeVerificationStatus,
      qualitySyncedAt: new Date(),
    },
  });
  return NextResponse.json({
    ok: true,
    qualityRating: updated.qualityRating,
    messagingTier: updated.messagingTier,
    codeVerificationStatus: updated.codeVerificationStatus,
    qualitySyncedAt: updated.qualitySyncedAt?.toISOString() ?? null,
  });
}
