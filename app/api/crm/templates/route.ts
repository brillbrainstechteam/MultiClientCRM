import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { graphBase } from '@/lib/meta/config';
import { graphErrorMessage, isAuthError, markTokenInvalid, type GraphErrorBody } from '@/lib/meta/account';
import { readTemplates } from '@/lib/meta/template-cache';
import { audit } from '@/lib/crm/audit';

/**
 * The connected WABA's message templates.
 *
 * Served from the local mirror (lib/meta/template-cache.ts), which refreshes
 * itself from Meta when it is older than ten minutes or when `?refresh=1` asks.
 * Shape is unchanged — name/language/status/category/components, raw, with the
 * Templates module doing the mapping — plus `cachedAt` so the UI can say how
 * fresh the list is.
 *
 * Every read used to be a Graph call: slow on each page load, rate-limited, and
 * blank whenever the token or the network blinked.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const force = new URL(req.url).searchParams.get('refresh') === '1';
  try {
    return NextResponse.json(await readTemplates(user.tenantId, { force }));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not load templates.' },
      { status: 502 },
    );
  }
}

/**
 * Delete a template on Meta. ?name= deletes all languages of that name;
 * add &metaTemplateId= (Meta's template id) to delete just one language.
 */
export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!['owner', 'admin', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Your role cannot delete templates.' }, { status: 403 });
  }

  const sp = new URL(req.url).searchParams;
  const name = sp.get('name');
  const metaTemplateId = sp.get('metaTemplateId');
  if (!name) return NextResponse.json({ error: 'A template name is required.' }, { status: 400 });

  const account = await prisma.whatsAppAccount.findFirst({
    where: { tenantId: user.tenantId, status: 'connected' },
    orderBy: { connectedAt: 'desc' },
  });
  if (!account?.wabaId || !account.accessToken) {
    return NextResponse.json({ error: 'No connected WhatsApp number.' }, { status: 400 });
  }

  const qs = new URLSearchParams({ name });
  if (metaTemplateId) qs.set('hsm_id', metaTemplateId);
  const res = await fetch(`${graphBase()}/${account.wabaId}/message_templates?${qs.toString()}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${decrypt(account.accessToken)}` },
  });
  const json = (await res.json().catch(() => ({}))) as { success?: boolean } & GraphErrorBody;
  if (!res.ok) {
    if (isAuthError(json)) await markTokenInvalid(account.id, graphErrorMessage(json, 'Meta rejected the stored token.'));
    return NextResponse.json({ error: graphErrorMessage(json, `Could not delete the template (${res.status}).`) }, { status: 502 });
  }

  // Mark it gone locally straight away. Soft, so a campaign that already sent
  // under this template can still say what it used.
  await prisma.crmTemplate.updateMany({
    where: {
      tenantId: user.tenantId,
      name,
      ...(metaTemplateId ? { metaTemplateId } : {}),
      deletedAt: null,
    },
    data: { deletedAt: new Date() },
  }).catch(() => {});

  await audit({ tenantId: user.tenantId, actorId: user.id, action: 'template.delete', targetType: 'template', targetId: metaTemplateId ?? name, detail: name });
  return NextResponse.json({ ok: true });
}
