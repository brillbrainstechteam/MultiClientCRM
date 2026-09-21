import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { exchangeCodeForToken } from '@/lib/meta/graph';
import { finalizeConnection } from '@/lib/meta/finalize';

/**
 * Finalises a JS-SDK Embedded Signup. The browser sends the authorization `code`
 * plus the session's `event` (FINISH / FINISH_ONLY_WABA), `waba_id`,
 * `phone_number_id` and chosen `strategy`. We exchange the code (no redirect_uri)
 * then run the shared finalize (subscribe → health → register → store).
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { code?: string; wabaId?: string; phoneNumberId?: string; event?: string; strategy?: string; path?: string }
    | null;
  if (!body?.code) return NextResponse.json({ error: 'Missing authorization code.' }, { status: 400 });

  const strategy = body.strategy ?? body.path ?? null;
  const coexistence = body.event === 'FINISH_ONLY_WABA' || strategy === 'coexistence';

  try {
    const { access_token } = await exchangeCodeForToken(body.code);
    const { phoneNumberId, pinRequired } = await finalizeConnection({
      tenantId: user.tenantId,
      businessName: user.tenant.businessName,
      token: access_token,
      wabaId: body.wabaId ?? null,
      phoneNumberId: body.phoneNumberId ?? null,
      coexistence,
      strategy,
    });
    return NextResponse.json({ ok: true, pinRequired, phoneNumberId, coexistence });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Meta connection failed.';
    await prisma.onboardingSession
      .upsert({ where: { tenantId: user.tenantId }, create: { tenantId: user.tenantId, status: 'error', errorMessage: message }, update: { status: 'error', errorMessage: message } })
      .catch(() => undefined);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
