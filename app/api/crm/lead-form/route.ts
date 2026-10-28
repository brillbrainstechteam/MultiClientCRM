import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';

/**
 * The tenant's single public lead-capture form (Lead Capture — public intake).
 *
 * GET   : return the shareable form token (minting one on first use) + state.
 * PATCH : enable/disable the form, or rotate the token to kill an old link.
 *
 * Managing the public link is a manager action; the form itself is public and
 * lives at /f/<token> with no auth.
 */
const MANAGER_ROLES = ['owner', 'admin', 'manager'];

/** URL-safe, unguessable token. */
const mintToken = () => randomBytes(18).toString('base64url');

async function ensureToken(tenantId: string): Promise<{ leadFormToken: string; leadFormEnabled: boolean; businessModel: string }> {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { leadFormToken: true, leadFormEnabled: true, businessModel: true } });
  if (t?.leadFormToken) return { leadFormToken: t.leadFormToken, leadFormEnabled: t.leadFormEnabled, businessModel: t.businessModel };
  const token = mintToken();
  const updated = await prisma.tenant.update({ where: { id: tenantId }, data: { leadFormToken: token }, select: { leadFormToken: true, leadFormEnabled: true, businessModel: true } });
  return { leadFormToken: updated.leadFormToken!, leadFormEnabled: updated.leadFormEnabled, businessModel: updated.businessModel };
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!MANAGER_ROLES.includes(user.role)) return NextResponse.json({ error: 'Only a manager can manage the lead form.' }, { status: 403 });
  const t = await ensureToken(user.tenantId);
  return NextResponse.json({ token: t.leadFormToken, enabled: t.leadFormEnabled, businessModel: t.businessModel, path: `/f/${t.leadFormToken}` });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!MANAGER_ROLES.includes(user.role)) return NextResponse.json({ error: 'Only a manager can manage the lead form.' }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as { action?: string; enabled?: boolean };
  const data: Record<string, unknown> = {};
  if (b.action === 'rotate') data.leadFormToken = mintToken();
  else if (b.action === 'set_enabled') data.leadFormEnabled = b.enabled !== false;
  else return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });

  const updated = await prisma.tenant.update({ where: { id: user.tenantId }, data, select: { leadFormToken: true, leadFormEnabled: true } });
  await audit({ tenantId: user.tenantId, actorId: user.id, action: `lead_form.${b.action}`, targetType: 'tenant', targetId: user.tenantId });
  return NextResponse.json({ token: updated.leadFormToken, enabled: updated.leadFormEnabled, path: updated.leadFormToken ? `/f/${updated.leadFormToken}` : null });
}
