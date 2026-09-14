import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { encrypt } from '@/lib/crypto';
import { getPhoneNumbers, subscribeAppToWaba, wabaIdsFromToken } from '@/lib/meta/graph';

/**
 * Connect a WhatsApp Business Account with a token the client supplies
 * directly, instead of going through Embedded Signup.
 *
 * Needed whenever ES is unavailable — the provider business is not yet cleared
 * to onboard customers, the client's portfolio is mid-verification, or a
 * self-hosted client simply prefers issuing their own System User token. The
 * token is validated against Graph before anything is written, so a typo fails
 * loudly here rather than silently later.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { token?: string; wabaId?: string; phoneNumberId?: string };
  const token = body.token?.trim();
  if (!token) return NextResponse.json({ error: 'Paste a System User access token.' }, { status: 400 });

  // Resolve the WABA: the caller's value wins, else read it off the token.
  let wabaId = body.wabaId?.trim() || null;
  if (!wabaId) {
    const ids = await wabaIdsFromToken(token).catch(() => []);
    wabaId = ids[0] ?? null;
  }
  if (!wabaId) {
    return NextResponse.json(
      { error: 'Could not work out the WhatsApp Business Account from this token. Enter the WABA ID as well.' },
      { status: 400 },
    );
  }

  // Prove the token can actually read the WABA before storing it.
  let phones: Awaited<ReturnType<typeof getPhoneNumbers>>;
  try {
    phones = await getPhoneNumbers(wabaId, token);
  } catch (e) {
    // The usual cause is setup, not a typo: spell out the two Business Settings
    // steps that make a System User token work for a WABA.
    const detail = e instanceof Error ? e.message.slice(0, 200) : '';
    return NextResponse.json(
      {
        error:
          `Meta rejected this token for WhatsApp account ${wabaId}. Check that (1) the system user has this ` +
          `WhatsApp account assigned — Business Settings → Users → System users → Assign assets — and (2) the ` +
          `token was generated for the TalkTrackCRM app with both WhatsApp permissions.` +
          (detail ? ` Details: ${detail}` : ''),
      },
      { status: 400 },
    );
  }
  if (!phones.length) {
    return NextResponse.json({ error: `No phone numbers found on WABA ${wabaId}.` }, { status: 400 });
  }

  const chosen = body.phoneNumberId ? phones.find((p) => p.id === body.phoneNumberId) : phones[0];
  if (!chosen) {
    return NextResponse.json({ error: `Phone number ${body.phoneNumberId} is not on WABA ${wabaId}.` }, { status: 400 });
  }

  // Best-effort: without this Meta never delivers webhooks to us, but a failure
  // here is recoverable from the diagnostics page.
  let subscribeWarning: string | null = null;
  await subscribeAppToWaba(wabaId, token).catch((e: Error) => {
    subscribeWarning = e.message;
  });

  const data = {
    wabaId,
    phoneNumberId: chosen.id,
    displayPhone: chosen.display_phone_number,
    verifiedName: chosen.verified_name,
    accessToken: encrypt(token),
    status: 'connected',
    statusReason: null,
    connectedAt: new Date(),
  };

  const existing = await prisma.whatsAppAccount.findFirst({
    where: { tenantId: user.tenantId, phoneNumberId: chosen.id },
  });
  if (existing) await prisma.whatsAppAccount.update({ where: { id: existing.id }, data });
  else await prisma.whatsAppAccount.create({ data: { tenantId: user.tenantId, ...data } });

  return NextResponse.json({
    ok: true,
    wabaId,
    phoneNumberId: chosen.id,
    displayPhone: chosen.display_phone_number,
    verifiedName: chosen.verified_name,
    subscribeWarning,
    numbersAvailable: phones.map((p) => ({ id: p.id, display: p.display_phone_number })),
  });
}
