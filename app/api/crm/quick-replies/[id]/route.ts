import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';
import { normaliseShortcut, validateQuickReply } from '@/lib/crm/quick-replies';

/**
 * Edit, delete, or count a use of one quick reply.
 *
 * Who may change what: a personal reply belongs to its owner; a workspace one is
 * owner/admin/manager only, because it is what the whole team sends out.
 */

async function load(id: string, tenantId: string) {
  return prisma.crmQuickReply.findFirst({ where: { id, tenantId } });
}

function mayEdit(
  reply: { scope: string; ownerId: string | null },
  user: { id: string; role: string },
): boolean {
  if (reply.scope === 'personal') return reply.ownerId === user.id;
  return ['owner', 'admin', 'manager'].includes(user.role);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;

  const existing = await load(id, user.tenantId);
  if (!existing) return NextResponse.json({ error: 'Quick reply not found.' }, { status: 404 });
  if (!mayEdit(existing, user)) {
    return NextResponse.json(
      { error: 'Only a manager or admin can change a shared quick reply.' },
      { status: 403 },
    );
  }

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : undefined);

  const shortcut = b.shortcut !== undefined ? normaliseShortcut(String(b.shortcut)) : existing.shortcut;
  const title = str(b.title) ?? existing.title;
  const body = str(b.body) ?? existing.body;

  const issues = validateQuickReply({ shortcut, title, body });
  if (issues.length) return NextResponse.json({ error: issues[0].message, issues }, { status: 400 });

  if (shortcut !== existing.shortcut) {
    const clash = await prisma.crmQuickReply.findFirst({
      where: { tenantId: user.tenantId, shortcut, id: { not: id } },
      select: { title: true },
    });
    if (clash) {
      return NextResponse.json(
        { error: `/${shortcut} is already used by "${clash.title}".` },
        { status: 409 },
      );
    }
  }

  // Sharing a personal reply with the team is itself a privileged act.
  let scope = existing.scope;
  if (typeof b.scope === 'string' && b.scope !== existing.scope) {
    if (b.scope === 'workspace' && !['owner', 'admin', 'manager'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only a manager or admin can share a quick reply with the team.' },
        { status: 403 },
      );
    }
    scope = b.scope === 'personal' ? 'personal' : 'workspace';
  }

  const updated = await prisma.crmQuickReply.update({
    where: { id },
    data: {
      shortcut, title, body, scope,
      ownerId: scope === 'personal' ? (existing.ownerId ?? user.id) : null,
      ...(str(b.category) ? { category: str(b.category)! } : {}),
      ...(str(b.language) ? { language: str(b.language)! } : {}),
    },
  });
  await audit({
    tenantId: user.tenantId, actorId: user.id, action: 'quickReply.updated',
    targetType: 'quickReply', targetId: id, detail: `/${updated.shortcut}`,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;

  const existing = await load(id, user.tenantId);
  if (!existing) return NextResponse.json({ error: 'Quick reply not found.' }, { status: 404 });
  if (!mayEdit(existing, user)) {
    return NextResponse.json(
      { error: 'Only a manager or admin can delete a shared quick reply.' },
      { status: 403 },
    );
  }

  await prisma.crmQuickReply.delete({ where: { id } });
  await audit({
    tenantId: user.tenantId, actorId: user.id, action: 'quickReply.deleted',
    targetType: 'quickReply', targetId: id, detail: `/${existing.shortcut}`,
  });
  return NextResponse.json({ ok: true });
}

/**
 * Count a use. Fire-and-forget from the composer: this is what sorts the list
 * most-used-first, and what tells a manager which canned replies earn their
 * place and which are dead weight.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;

  const existing = await load(id, user.tenantId);
  if (!existing) return NextResponse.json({ error: 'Quick reply not found.' }, { status: 404 });

  await prisma.crmQuickReply.update({
    where: { id },
    data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
