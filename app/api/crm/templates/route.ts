import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { graphBase } from '@/lib/meta/config';
import { graphErrorMessage, isAuthError, markTokenInvalid, type GraphErrorBody } from '@/lib/meta/account';
import { audit } from '@/lib/crm/audit';

/**
 * The connected WABA's message templates, straight from Meta Graph. Returned
 * raw (name/language/status/category/components) — the Templates module maps
 * them into its repository shape. Empty when no number is connected yet.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const account = await prisma.whatsAppAccount.findFirst({
    where: { tenantId: user.tenantId, status: 'connected' },
    orderBy: { connectedAt: 'desc' },
  });
  if (!account?.wabaId || !account.accessToken) {
    return NextResponse.json({ connected: false, wabaId: null, account: null, templates: [] });
  }

  // The module's WABA scope selector is built from this, so the real account
  // replaces the fixture WABAs rather than sitting alongside them.
  const summary = {
    wabaId: account.wabaId,
    name: account.verifiedName ?? account.displayPhone ?? 'WhatsApp Business Account',
    displayPhone: account.displayPhone,
  };

  try {
    const token = decrypt(account.accessToken);
    const url = `${graphBase()}/${account.wabaId}/message_templates?limit=200&fields=name,language,status,category,components,id,quality_score`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const json = (await res.json().catch(() => ({}))) as { data?: unknown[] } & GraphErrorBody;
    if (!res.ok) {
      // A revoked Business Integration shows up here first — repair the row so
      // the next sign-in routes back through Embedded Signup.
      if (isAuthError(json)) {
        await markTokenInvalid(account.id, json.error?.message ?? 'Meta rejected the stored token.');
        return NextResponse.json({ connected: false, wabaId: null, account: null, templates: [], reconnectRequired: true });
      }
      return NextResponse.json({ error: json?.error?.message ?? 'Could not load templates from Meta.' }, { status: 502 });
    }
    return NextResponse.json({ connected: true, wabaId: account.wabaId, account: summary, templates: json.data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not load templates.' }, { status: 502 });
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

  await audit({ tenantId: user.tenantId, actorId: user.id, action: 'template.delete', targetType: 'template', targetId: metaTemplateId ?? name, detail: name });
  return NextResponse.json({ ok: true });
}
