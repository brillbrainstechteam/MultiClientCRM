import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { exchangeCodeForToken } from '@/lib/meta/graph';
import { finalizeConnection } from '@/lib/meta/finalize';
import { connectionModeFromEvent, isWabaOnly } from '@/lib/meta/embedded-signup';

/**
 * Finalises a JS-SDK Embedded Signup.
 *
 * The browser sends the authorization `code` plus the session's finish `event`,
 * `waba_id`, `phone_number_id`, `business_id` and the strategy the customer
 * chose on our own screen. We exchange the code (no redirect_uri) then run the
 * shared finalize (subscribe → health → register → store).
 *
 * The finish event decides the connection mode, and the two that look alike are
 * not the same thing: `FINISH_ONLY_WABA` means no phone number was added, while
 * `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING` means coexistence. Only the latter
 * may request the one-time history sync — see lib/meta/embedded-signup.ts.
 *
 * Meta's exchangeable code lives for 30 seconds, so nothing slow runs before
 * the exchange.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | {
        code?: string; wabaId?: string; phoneNumberId?: string; businessId?: string;
        event?: string; strategy?: string; path?: string;
      }
    | null;
  if (!body?.code) return NextResponse.json({ error: 'Missing authorization code.' }, { status: 400 });

  const strategy = body.strategy ?? body.path ?? null;
  const event = body.event ?? null;
  const connectionMode = connectionModeFromEvent(event, strategy);
  const coexistence = connectionMode === 'coexistence';
  // No number was added, so there is nothing to register or sync yet.
  const wabaOnly = isWabaOnly(event);

  try {
    const { access_token } = await exchangeCodeForToken(body.code);
    const { phoneNumberId, pinRequired } = await finalizeConnection({
      tenantId: user.tenantId,
      businessName: user.tenant.businessName,
      token: access_token,
      wabaId: body.wabaId ?? null,
      phoneNumberId: body.phoneNumberId ?? null,
      businessId: body.businessId ?? null,
      coexistence,
      connectionMode,
      // Registering a number that does not exist would fail the whole connect.
      skipRegister: wabaOnly,
      strategy,
    });
    return NextResponse.json({ ok: true, pinRequired, phoneNumberId, coexistence, connectionMode, wabaOnly });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Meta connection failed.';
    await prisma.onboardingSession
      .upsert({ where: { tenantId: user.tenantId }, create: { tenantId: user.tenantId, status: 'error', errorMessage: message }, update: { status: 'error', errorMessage: message } })
      .catch(() => undefined);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
