import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { encrypt } from '@/lib/crypto';
import { exchangeCodeForToken, getPhoneNumbers, subscribeAppToWaba } from '@/lib/meta/graph';

/**
 * Finalises an Embedded Signup: the browser sends the authorization `code`
 * (plus the waba_id / phone_number_id captured from the SDK session). We
 * exchange the code server-side (using the App Secret), subscribe our app to
 * the client's WABA, resolve the number, and store it against the tenant.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { code?: string; wabaId?: string; phoneNumberId?: string; path?: string }
    | null;

  if (!body?.code) return NextResponse.json({ error: 'Missing authorization code.' }, { status: 400 });

  try {
    const { access_token } = await exchangeCodeForToken(body.code);

    let wabaId = body.wabaId ?? null;
    let phoneNumberId = body.phoneNumberId ?? null;
    let displayPhone: string | null = null;
    let verifiedName: string | null = null;

    if (wabaId) {
      // Best-effort: don't fail the whole connect if one call errors.
      await subscribeAppToWaba(wabaId, access_token).catch(() => undefined);
      const phones = await getPhoneNumbers(wabaId, access_token).catch(() => []);
      const match = phones.find((p) => !phoneNumberId || p.id === phoneNumberId) ?? phones[0];
      if (match) {
        phoneNumberId = match.id;
        displayPhone = match.display_phone_number;
        verifiedName = match.verified_name;
      }
    }

    await prisma.whatsAppAccount.create({
      data: {
        tenantId: user.tenantId,
        wabaId,
        phoneNumberId,
        displayPhone,
        verifiedName,
        accessToken: encrypt(access_token),
        status: 'connected',
        connectedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Meta connection failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
