import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';

/**
 * Rename, re-filter, pin or delete a saved inbox view.
 *
 * A personal view belongs to its owner; a workspace view is manager/admin only,
 * because the whole team works from it and one person quietly re-scoping
 * "Hot leads waiting" changes what everyone else sees.
 */

async function loadEditable(id: string, user: { id: string; tenantId: string; role: string }) {
  const view = await prisma.crmSavedView.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!view) return { view: null, mayEdit: false } as const;
  const mayEdit = view.ownerId
    ? view.ownerId === user.id
    : ['owner', 'admin', 'manager'].includes(user.role);
  return { view, mayEdit } as const;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;

  const { view, mayEdit } = await loadEditable(id, user);
  if (!view) return NextResponse.json({ error: 'View not found.' }, { status: 404 });
  if (!mayEdit) {
    return NextResponse.json(
      { error: 'Only a manager or admin can change a shared view.' },
      { status: 403 },
    );
  }

  const b = (await req.json().catch(() => null)) as {
    name?: string; filters?: unknown; isPinned?: boolean; sortOrder?: number;
  } | null;
  if (!b) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });

  const name = typeof b.name === 'string' ? b.name.trim() : undefined;
  if (name !== undefined && !name) {
    return NextResponse.json({ error: 'A view needs a name.' }, { status: 400 });
  }

  await prisma.crmSavedView.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(b.filters && typeof b.filters === 'object' ? { filters: b.filters as object } : {}),
      ...(typeof b.isPinned === 'boolean' ? { isPinned: b.isPinned } : {}),
      ...(typeof b.sortOrder === 'number' ? { sortOrder: b.sortOrder } : {}),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;

  const { view, mayEdit } = await loadEditable(id, user);
  if (!view) return NextResponse.json({ error: 'View not found.' }, { status: 404 });
  if (!mayEdit) {
    return NextResponse.json(
      { error: 'Only a manager or admin can delete a shared view.' },
      { status: 403 },
    );
  }

  await prisma.crmSavedView.delete({ where: { id } });
  await audit({
    tenantId: user.tenantId, actorId: user.id, action: 'inboxView.deleted',
    targetType: 'savedView', targetId: id, detail: view.name,
  });
  return NextResponse.json({ ok: true });
}
