import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';

/**
 * Edit or remove a Lead Source Connection. WhatsApp numbers shown in the list
 * are derived from WhatsAppAccount (id "wa:…") and are managed on the WhatsApp
 * screen, so they cannot be edited here.
 */
const MANAGER_ROLES = ['owner', 'admin', 'manager'];

function guardDerived(id: string) {
  return id.startsWith('wa:') ? NextResponse.json({ error: 'WhatsApp numbers are managed on the WhatsApp settings screen.' }, { status: 400 }) : null;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!MANAGER_ROLES.includes(user.role)) return NextResponse.json({ error: 'Only a manager can change connections.' }, { status: 403 });
  const { id } = await ctx.params;
  const derived = guardDerived(id); if (derived) return derived;

  const conn = await prisma.crmSourceConnection.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!conn) return NextResponse.json({ error: 'Connection not found.' }, { status: 404 });

  const b = (await req.json().catch(() => ({}))) as { action?: string; displayName?: string; enabled?: boolean; enabledSources?: string[] };
  const data: Record<string, unknown> = {};
  switch (b.action) {
    case 'set_active': data.active = b.enabled !== false; data.status = b.enabled !== false ? (conn.authStatus === 'ok' ? 'connected' : conn.status) : 'disconnected'; break;
    case 'rename': if (typeof b.displayName === 'string' && b.displayName.trim()) data.displayName = b.displayName.trim(); break;
    case 'set_sources': data.enabledSources = Array.isArray(b.enabledSources) ? b.enabledSources.filter((s) => typeof s === 'string') : []; break;
    case 'clear_error': data.lastError = null; data.status = conn.active ? 'connected' : conn.status; break;
    default: return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  }
  const updated = await prisma.crmSourceConnection.update({ where: { id }, data });
  await audit({ tenantId: user.tenantId, actorId: user.id, action: `connection.${b.action}`, targetType: 'source_connection', targetId: id });
  return NextResponse.json({ ok: true, active: updated.active, status: updated.status });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!MANAGER_ROLES.includes(user.role)) return NextResponse.json({ error: 'Only a manager can remove connections.' }, { status: 403 });
  const { id } = await ctx.params;
  const derived = guardDerived(id); if (derived) return derived;

  const conn = await prisma.crmSourceConnection.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!conn) return NextResponse.json({ error: 'Connection not found.' }, { status: 404 });
  await prisma.crmSourceConnection.delete({ where: { id } });
  await audit({ tenantId: user.tenantId, actorId: user.id, action: 'connection.removed', targetType: 'source_connection', targetId: id, detail: conn.displayName });
  return NextResponse.json({ ok: true });
}
