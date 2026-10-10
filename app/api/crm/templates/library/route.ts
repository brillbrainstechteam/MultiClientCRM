import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { graphBase } from '@/lib/meta/config';
import { graphErrorMessage, isAuthError, markTokenInvalid, type GraphErrorBody } from '@/lib/meta/account';
import { audit } from '@/lib/crm/audit';

/**
 * WhatsApp Template Library — Meta's catalogue of pre-written utility/auth
 * templates. Library templates are fixed content with typed parameters, and a
 * template created from one comes back APPROVED immediately (no review wait),
 * which makes it the lowest-effort way for an SME to get a working template,
 * and it exists in many languages.
 *
 * GET  : browse the library (filters: search, topic, usecase, industry, language).
 * POST : create a template on the connected WABA from a library entry.
 */

async function connectedAccount(tenantId: string) {
  return prisma.whatsAppAccount.findFirst({
    where: { tenantId, status: 'connected' },
    orderBy: { connectedAt: 'desc' },
  });
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const account = await connectedAccount(user.tenantId);
  if (!account?.accessToken) {
    return NextResponse.json({ error: 'Connect a WhatsApp number to browse the template library.' }, { status: 400 });
  }

  const sp = new URL(req.url).searchParams;
  const qs = new URLSearchParams();
  for (const key of ['search', 'topic', 'usecase', 'industry', 'language', 'name'] as const) {
    const v = sp.get(key);
    if (v) qs.set(key, v);
  }
  qs.set('limit', sp.get('limit') ?? '100');

  const url = `${graphBase()}/message_template_library?${qs.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${decrypt(account.accessToken)}` } });
  const json = (await res.json().catch(() => ({}))) as { data?: unknown[] } & GraphErrorBody;

  if (!res.ok) {
    if (isAuthError(json)) await markTokenInvalid(account.id, graphErrorMessage(json, 'Meta rejected the stored token.'));
    return NextResponse.json({ error: graphErrorMessage(json, `Could not load the template library (${res.status}).`) }, { status: 502 });
  }

  return NextResponse.json({ templates: json.data ?? [] });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!['owner', 'admin', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Your role cannot add templates.' }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    language?: string;
    libraryTemplateName?: string;
    category?: string;
    buttonInputs?: unknown[];
  };
  const name = body.name?.trim();
  const language = body.language?.trim();
  const libraryTemplateName = body.libraryTemplateName?.trim();
  if (!name || !language || !libraryTemplateName) {
    return NextResponse.json({ error: 'name, language and libraryTemplateName are required.' }, { status: 400 });
  }

  const account = await connectedAccount(user.tenantId);
  if (!account?.wabaId || !account.accessToken) {
    return NextResponse.json({ error: 'Connect a WhatsApp number before adding templates.' }, { status: 400 });
  }

  const requestBody: Record<string, unknown> = {
    name,
    // Library templates are UTILITY or AUTHENTICATION; default to UTILITY.
    category: (body.category ?? 'UTILITY').toUpperCase(),
    language,
    library_template_name: libraryTemplateName,
  };
  if (Array.isArray(body.buttonInputs) && body.buttonInputs.length) {
    requestBody.library_template_button_inputs = body.buttonInputs;
  }

  const res = await fetch(`${graphBase()}/${account.wabaId}/message_templates`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${decrypt(account.accessToken)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; status?: string; category?: string } & GraphErrorBody;

  if (!res.ok) {
    if (isAuthError(json)) await markTokenInvalid(account.id, graphErrorMessage(json, 'Meta rejected the stored token.'));
    return NextResponse.json({ error: graphErrorMessage(json, `Meta rejected the template (${res.status}).`) }, { status: 502 });
  }

  await audit({
    tenantId: user.tenantId,
    actorId: user.id,
    action: 'template.library_add',
    targetType: 'template',
    targetId: json.id ?? '',
    detail: `${name} (${language}) from library "${libraryTemplateName}"`,
  });

  return NextResponse.json({
    ok: true,
    metaTemplateId: json.id ?? '',
    status: (json.status ?? 'APPROVED').toUpperCase(),
    category: json.category ?? requestBody.category,
  });
}
