import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { encrypt } from '@/lib/crypto';
import { exchangeCodeWithRedirect, wabaIdsFromToken, getPhoneNumbers, subscribeAppToWaba } from '@/lib/meta/graph';
import { metaRedirectUri } from '../start/route';

/** Land back on onboarding with a readable status. */
const done = (req: Request, params: Record<string, string>) => {
  const url = new URL('/onboarding', req.url);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
};

/**
 * Embedded Signup callback. Exchanges the code using the SAME redirect_uri the
 * start route sent, resolves the granted WABA from the token's granular scopes,
 * subscribes our app to it and stores the connected number.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL('/login', req.url));

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error_description') ?? url.searchParams.get('error');

  if (error) return done(req, { connect: 'error', reason: error.slice(0, 300) });

  const store = await cookies();
  const expected = store.get('meta_oauth_state')?.value;
  store.delete('meta_oauth_state');
  if (!code || !state || !expected || state !== expected) {
    return done(req, { connect: 'error', reason: 'Security check failed (state mismatch). Please try again.' });
  }

  try {
    const { access_token } = await exchangeCodeWithRedirect(code, metaRedirectUri(url.origin));

    const wabaIds = await wabaIdsFromToken(access_token);
    const wabaId = wabaIds[0] ?? null;

    let phoneNumberId: string | null = null;
    let displayPhone: string | null = null;
    let verifiedName: string | null = null;

    if (wabaId) {
      await subscribeAppToWaba(wabaId, access_token).catch(() => undefined);
      const phones = await getPhoneNumbers(wabaId, access_token).catch(() => []);
      const first = phones[0];
      if (first) {
        phoneNumberId = first.id;
        displayPhone = first.display_phone_number;
        verifiedName = first.verified_name;
      }
    }

    // One connected account per number for this tenant.
    const existing = phoneNumberId
      ? await prisma.whatsAppAccount.findFirst({ where: { tenantId: user.tenantId, phoneNumberId } })
      : null;
    const data = {
      wabaId,
      phoneNumberId,
      displayPhone,
      verifiedName,
      accessToken: encrypt(access_token),
      status: 'connected',
      connectedAt: new Date(),
    };
    if (existing) await prisma.whatsAppAccount.update({ where: { id: existing.id }, data });
    else await prisma.whatsAppAccount.create({ data: { tenantId: user.tenantId, ...data } });

    return NextResponse.redirect(new URL('/crm/dashboard', req.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Meta connection failed.';
    return done(req, { connect: 'error', reason: message.slice(0, 300) });
  }
}
