import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { exchangeCodeWithRedirect, wabaIdsFromToken } from '@/lib/meta/graph';
import { finalizeConnection } from '@/lib/meta/finalize';
import { metaRedirectUri } from '../start/route';

/** Record why onboarding didn't finish, so the client can resume. */
async function markSession(tenantId: string, status: 'cancelled' | 'error', reason: string) {
  await prisma.onboardingSession
    .upsert({
      where: { tenantId },
      create: { tenantId, status, errorMessage: reason.slice(0, 300) },
      update: { status, errorMessage: reason.slice(0, 300) },
    })
    .catch(() => undefined);
}

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

  // Meta returns error=access_denied when the client closes/declines the dialog.
  if (error) {
    const cancelled = /access_denied|cancel/i.test(error);
    await markSession(user.tenantId, cancelled ? 'cancelled' : 'error', error);
    return done(req, { connect: cancelled ? 'cancelled' : 'error', reason: error.slice(0, 300) });
  }

  const store = await cookies();
  const expected = store.get('meta_oauth_state')?.value;
  const path = store.get('meta_oauth_path')?.value ?? 'existing';
  store.delete('meta_oauth_state');
  store.delete('meta_oauth_path');
  if (!code || !state || !expected || state !== expected) {
    await markSession(user.tenantId, 'error', 'Security check failed (state mismatch).');
    return done(req, { connect: 'error', reason: 'Security check failed (state mismatch). Please try again.' });
  }

  try {
    const { access_token } = await exchangeCodeWithRedirect(code, metaRedirectUri(url.origin));
    const wabaId = (await wabaIdsFromToken(access_token))[0] ?? null;

    const { pinRequired } = await finalizeConnection({
      tenantId: user.tenantId,
      businessName: user.tenant.businessName,
      token: access_token,
      wabaId,
      coexistence: path === 'coexistence',
      strategy: path,
    });

    // Existing number needs its 2-step PIN — send the client to enter it.
    const dest = pinRequired ? new URL('/onboarding?connect=pin', req.url) : new URL('/crm/dashboard', req.url);
    return NextResponse.redirect(dest);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Meta connection failed.';
    await markSession(user.tenantId, 'error', message);
    return done(req, { connect: 'error', reason: message.slice(0, 300) });
  }
}
