import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { getPhoneNumbers, inspectToken } from '@/lib/meta/graph';
import { finalizeConnection } from '@/lib/meta/finalize';

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

const day = (epochSeconds: number) => new Date(epochSeconds * 1000).toISOString().slice(0, 10);

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { token?: string; wabaId?: string; phoneNumberId?: string };
  const token = body.token?.trim();
  if (!token) return NextResponse.json({ error: 'Paste a System User access token.' }, { status: 400 });

  // Ask Meta about the token first. A dead token fails here with Meta's reason;
  // a personal (USER) token is flagged, because it dies whenever its owner logs
  // out of Facebook or removes the integration — a System User token does not.
  const info = await inspectToken(token);
  if (!info.isValid) {
    return NextResponse.json(
      {
        error:
          `Meta says this token is no longer valid${info.error ? ` (${info.error})` : ''}. ` +
          'Generate a new System User token and paste that instead.',
      },
      { status: 400 },
    );
  }
  const permanent = info.type === 'SYSTEM_USER' && !info.expiresAt;
  const tokenWarning = permanent
    ? null
    : info.type === 'SYSTEM_USER'
      ? `This System User token expires on ${day(info.expiresAt!)}. Generate one with expiry "Never" for a permanent connection.`
      : `This is a personal ${info.type ? `(${info.type}) ` : ''}token${info.expiresAt ? ` that expires on ${day(info.expiresAt)}` : ''}. ` +
        'It stops working if you log out of Facebook or remove the TalkTrackCRM integration — use a System User token for a permanent connection.';

  // Resolve the WABA: the caller's value wins, else read it off the token.
  const wabaId = body.wabaId?.trim() || info.wabaIds[0] || null;
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

  // Same completion path as Embedded Signup: subscribe our app to the WABA, sync
  // live health (quality/tier/verification), store, and mark onboarding Ready.
  // skipRegister — a manually supplied token means the number is already
  // registered for Cloud API, so we must not re-run /register.
  await finalizeConnection({
    tenantId: user.tenantId,
    businessName: user.tenant.businessName,
    token,
    wabaId,
    phoneNumberId: chosen.id,
    coexistence: false,
    skipRegister: true,
    strategy: 'existing',
  });

  // Retire any older rows for this number so a stale token can never win a
  // lookup again (rows are retired, not deleted — ids may be referenced).
  const saved = await prisma.whatsAppAccount.findFirst({
    where: { tenantId: user.tenantId, phoneNumberId: chosen.id, status: 'connected' },
    orderBy: { connectedAt: 'desc' },
  });
  if (saved) {
    await prisma.whatsAppAccount.updateMany({
      where: { tenantId: user.tenantId, phoneNumberId: chosen.id, id: { not: saved.id } },
      data: { status: 'disconnected', accessToken: null, statusReason: 'Superseded by a newer connection.' },
    });
  }

  return NextResponse.json({
    ok: true,
    wabaId,
    phoneNumberId: chosen.id,
    displayPhone: chosen.display_phone_number,
    verifiedName: chosen.verified_name,
    subscribeWarning: null,
    tokenType: info.type,
    tokenExpiresAt: info.expiresAt,
    tokenWarning,
    numbersAvailable: phones.map((p) => ({ id: p.id, display: p.display_phone_number })),
  });
}
