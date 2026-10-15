import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';

/**
 * Saved inbox views — a named combination of filters, e.g. "hot leads waiting
 * over a day".
 *
 * The filter set is stored as JSON rather than columns because it mirrors the
 * filter shape the UI already has, and that shape grows. A view that silently
 * dropped a filter the UI learned later would be worse than no view at all:
 * the operator would get a list that looks right and is not.
 *
 * Ownership is deliberately simple. A view with no owner belongs to the
 * workspace and everyone sees it; a view with an owner is that person's own.
 * Only a manager or admin can publish to the workspace, for the same reason
 * they alone can publish a quick reply — a shared view is something the whole
 * team then works from.
 */

function serialize(v: {
  id: string; name: string; filters: unknown; isPinned: boolean;
  ownerId: string | null; sortOrder: number; updatedAt: Date;
}) {
  return {
    id: v.id,
    name: v.name,
    filters: v.filters,
    isPinned: v.isPinned,
    scope: v.ownerId ? 'personal' : 'workspace',
    sortOrder: v.sortOrder,
    updatedAt: v.updatedAt.toISOString(),
  };
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const views = await prisma.crmSavedView.findMany({
    where: {
      tenantId: user.tenantId,
      // Everyone's workspace views, plus the caller's own.
      OR: [{ ownerId: null }, { ownerId: user.id }],
    },
    orderBy: [{ isPinned: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
  });
  return NextResponse.json({ views: views.map(serialize) });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const b = (await req.json().catch(() => null)) as {
    name?: string; filters?: unknown; scope?: string; isPinned?: boolean;
  } | null;
  if (!b) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });

  const name = (b.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'Give the view a name.' }, { status: 400 });
  if (!b.filters || typeof b.filters !== 'object') {
    return NextResponse.json({ error: 'A view needs at least one filter.' }, { status: 400 });
  }

  const wantsShared = b.scope === 'workspace';
  const canShare = ['owner', 'admin', 'manager'].includes(user.role);
  if (wantsShared && !canShare) {
    return NextResponse.json(
      { error: 'Only a manager or admin can share a view with the team.' },
      { status: 403 },
    );
  }

  const clash = await prisma.crmSavedView.findFirst({
    where: {
      tenantId: user.tenantId,
      name,
      OR: [{ ownerId: null }, { ownerId: user.id }],
    },
    select: { id: true },
  });
  if (clash) {
    return NextResponse.json({ error: `A view called "${name}" already exists.` }, { status: 409 });
  }

  const created = await prisma.crmSavedView.create({
    data: {
      tenantId: user.tenantId,
      ownerId: wantsShared ? null : user.id,
      name,
      filters: b.filters as object,
      isPinned: wantsShared ? !!b.isPinned : false,
      createdByUserId: user.id,
    },
  });
  await audit({
    tenantId: user.tenantId, actorId: user.id, action: 'inboxView.created',
    targetType: 'savedView', targetId: created.id,
    detail: `${name} (${wantsShared ? 'workspace' : 'personal'})`,
  });
  return NextResponse.json(serialize(created), { status: 201 });
}
