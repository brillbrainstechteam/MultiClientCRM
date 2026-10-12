import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { graphBase } from '@/lib/meta/config';
import { graphErrorMessage, type GraphErrorBody } from '@/lib/meta/account';
import { audit } from '@/lib/crm/audit';

/**
 * Conversational components for a number (doc §4.5) — "ice breakers"
 * (conversation starters) and commands. Backed by Meta's
 * `conversational_automation` on the phone number.
 *
 * GET  : read current ice breakers + commands + welcome flag.
 * POST : set them ({ iceBreakers: string[], commands: [{name, description}], enableWelcome }).
 *
 * Meta limits: up to 4 ice-breaker prompts (≤80 chars each) and up to 30 commands.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
async function account(id: string, tenantId: string) {
  const a = await prisma.whatsAppAccount.findUnique({ where: { id } });
  if (!a || a.tenantId !== tenantId) return null;
  return a;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await ctx.params;
  const a = await account(id, user.tenantId);
  if (!a) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  if (!a.phoneNumberId || !a.accessToken) return NextResponse.json({ error: 'This number has no live connection.' }, { status: 400 });

  const url = `${graphBase()}/${a.phoneNumberId}?fields=conversational_automation`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${decrypt(a.accessToken)}` } });
  const json = (await res.json().catch(() => ({}))) as any & GraphErrorBody;
  if (!res.ok) return NextResponse.json({ error: graphErrorMessage(json, `Could not read conversation starters (${res.status}).`) }, { status: 502 });

  const ca = json.conversational_automation ?? {};
  return NextResponse.json({
    enableWelcome: Boolean(ca.enable_welcome_message),
    iceBreakers: (ca.prompts ?? []).map((p: any) => (typeof p === 'string' ? p : p?.prompt_text ?? p?.text ?? '')).filter(Boolean),
    commands: (ca.commands ?? []).map((c: any) => ({ name: c.command_name ?? '', description: c.command_description ?? '' })),
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!['owner', 'admin', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Your role cannot change conversation starters.' }, { status: 403 });
  }
  const { id } = await ctx.params;
  const a = await account(id, user.tenantId);
  if (!a) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  if (!a.phoneNumberId || !a.accessToken) return NextResponse.json({ error: 'This number has no live connection.' }, { status: 400 });

  const b = (await req.json().catch(() => ({}))) as { iceBreakers?: unknown[]; commands?: unknown[]; enableWelcome?: boolean };
  const iceBreakers = (Array.isArray(b.iceBreakers) ? b.iceBreakers : [])
    .map((p) => String(p).trim()).filter(Boolean).slice(0, 4);
  const commands = (Array.isArray(b.commands) ? b.commands : [])
    .map((c) => c as { name?: string; description?: string })
    .filter((c) => c?.name?.trim())
    .map((c) => ({ command_name: String(c.name).trim().slice(0, 32), command_description: String(c.description ?? '').trim().slice(0, 256) }))
    .slice(0, 30);

  const payload = {
    enable_welcome_message: b.enableWelcome === true,
    prompts: iceBreakers,
    commands,
  };

  const res = await fetch(`${graphBase()}/${a.phoneNumberId}/conversational_automation`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${decrypt(a.accessToken)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = (await res.json().catch(() => ({}))) as { success?: boolean } & GraphErrorBody;
  if (!res.ok) return NextResponse.json({ error: graphErrorMessage(json, `Could not save conversation starters (${res.status}).`) }, { status: 502 });

  await audit({ tenantId: user.tenantId, actorId: user.id, action: 'whatsapp.conversational', targetType: 'whatsapp_number', targetId: id, detail: `${iceBreakers.length} ice breakers, ${commands.length} commands` });
  return NextResponse.json({ ok: true, iceBreakers, commands, enableWelcome: payload.enable_welcome_message });
}
