import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { graphBase } from '@/lib/meta/config';
import { graphErrorMessage, isAuthError, markTokenInvalid, type GraphErrorBody } from '@/lib/meta/account';
import { toMetaTemplate, TemplateMappingError, type TemplateDraftInput } from '@/lib/meta/templates';
import { audit } from '@/lib/crm/audit';

/**
 * Submit a template to Meta for review — create a new one on the connected
 * WABA, or edit an existing one when `metaTemplateId` is given. This is the
 * write half of whatsapp_business_management (the read half is GET
 * /api/crm/templates); the new template then comes back through that read with
 * Meta's real status.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!['owner', 'admin', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Your role cannot submit templates to Meta.' }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { draft?: TemplateDraftInput; metaTemplateId?: string };
  if (!body.draft) return NextResponse.json({ error: 'Missing template.' }, { status: 400 });

  const account = await prisma.whatsAppAccount.findFirst({
    where: { tenantId: user.tenantId, status: 'connected' },
    orderBy: { connectedAt: 'desc' },
  });
  if (!account?.wabaId || !account.accessToken) {
    return NextResponse.json({ error: 'Connect a WhatsApp number before submitting templates.' }, { status: 400 });
  }

  let payload;
  try {
    payload = toMetaTemplate(body.draft);
  } catch (e) {
    if (e instanceof TemplateMappingError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }

  // Editing sends only components — Meta does not allow renaming, and
  // re-categorising is restricted to rejected templates.
  const editing = body.metaTemplateId?.trim();
  const url = editing ? `${graphBase()}/${editing}` : `${graphBase()}/${account.wabaId}/message_templates`;
  const requestBody = editing ? { components: payload.components } : payload;

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${decrypt(account.accessToken)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; status?: string; category?: string } & GraphErrorBody;

  if (!res.ok) {
    if (isAuthError(json)) await markTokenInvalid(account.id, graphErrorMessage(json, 'Meta rejected the stored token.'));
    return NextResponse.json({ error: graphErrorMessage(json, `Meta rejected the template (${res.status}).`) }, { status: 502 });
  }

  const metaTemplateId = editing ?? json.id ?? '';
  await audit({
    tenantId: user.tenantId,
    actorId: user.id,
    action: editing ? 'template.edit' : 'template.submit',
    targetType: 'template',
    targetId: metaTemplateId,
    detail: `${payload.name} (${payload.language}, ${payload.category})`,
  });

  return NextResponse.json({
    ok: true,
    metaTemplateId,
    status: (json.status ?? 'PENDING').toUpperCase(),
    category: json.category ?? payload.category,
  });
}
