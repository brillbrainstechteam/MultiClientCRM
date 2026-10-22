import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';
import {
  canUse, destinationsFor, isComplete, usableAt,
  type Destination, type LibraryItemShape,
} from '@/lib/crm/library';

/**
 * Communication Library (PRD §17, LIB-01..05).
 *
 * One place for everything an agent might send: messages, creatives, voice
 * notes, videos, catalogues, documents, links and approved templates.
 *
 * The `?destination=` filter is what makes it more than a folder. A composer
 * asks for what it can actually send and gets exactly that, so an agent is
 * never offered a voice note for a campaign and refused afterwards.
 */

const KINDS = new Set(['text', 'image', 'video', 'audio', 'document', 'link', 'catalogue', 'template']);
const AUDIENCES = new Set(['new_lead', 'low_interest', 'journey', 'relationship', 'general']);
const DESTINATIONS = new Set([
  'one_to_one_live', 'one_to_one_template', 'campaign', 'managed_group', 'external_group_manual',
]);
const MANAGE_ROLES = ['owner', 'admin', 'manager'];

function serialize(i: {
  id: string; kind: string; title: string; body: string | null;
  fileId: string | null; linkUrl: string | null; catalogueItemIds: string[];
  templateId: string | null; audience: string; tags: string[]; language: string;
  isOwnerContent: boolean; scope: string; ownerId: string | null;
  active: boolean; usageCount: number; lastUsedAt: Date | null;
}) {
  const shape: LibraryItemShape = {
    kind: i.kind, templateId: i.templateId, fileId: i.fileId,
    linkUrl: i.linkUrl, body: i.body, catalogueItemIds: i.catalogueItemIds,
  };
  const complete = isComplete(shape);
  return {
    id: i.id,
    kind: i.kind,
    title: i.title,
    body: i.body,
    fileId: i.fileId,
    fileUrl: i.fileId ? `/api/crm/files/${i.fileId}` : null,
    linkUrl: i.linkUrl,
    catalogueItemIds: i.catalogueItemIds,
    templateId: i.templateId,
    audience: i.audience,
    tags: i.tags,
    language: i.language,
    isOwnerContent: i.isOwnerContent,
    scope: i.scope,
    active: i.active,
    usageCount: i.usageCount,
    lastUsedAt: i.lastUsedAt?.toISOString() ?? null,
    // Where it can go, and why not where it cannot — both computed from the
    // same matrix the composer uses, so the two can never disagree.
    destinations: destinationsFor(shape),
    complete: complete.ok,
    incompleteReason: complete.reason ?? null,
  };
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const url = new URL(req.url);
  const destination = url.searchParams.get('destination');
  const audience = url.searchParams.get('audience');
  const kind = url.searchParams.get('kind');
  const q = (url.searchParams.get('q') ?? '').trim();
  const includeInactive = url.searchParams.get('includeInactive') === 'true';

  if (destination && !DESTINATIONS.has(destination)) {
    return NextResponse.json({ error: 'Unknown destination.' }, { status: 400 });
  }

  const items = await prisma.crmLibraryItem.findMany({
    where: {
      tenantId: user.tenantId,
      ...(includeInactive ? {} : { active: true }),
      ...(audience && AUDIENCES.has(audience) ? { audience } : {}),
      ...(kind && KINDS.has(kind) ? { kind } : {}),
      // Workspace items plus the caller's own, same rule as saved views.
      AND: [
        { OR: [{ scope: 'workspace' }, { ownerId: user.id }] },
        ...(q ? [{
          OR: [
            { title: { contains: q, mode: 'insensitive' as const } },
            { body: { contains: q, mode: 'insensitive' as const } },
            { tags: { has: q.toLowerCase() } },
          ],
        }] : []),
      ],
    },
    orderBy: [{ usageCount: 'desc' }, { updatedAt: 'desc' }],
    take: 500,
  });

  const rows = items.map(serialize);

  // An incomplete item is hidden from a composer — it would fail on send —
  // but stays visible in the library screen so somebody can finish it.
  const usable = destination
    ? usableAt(items.filter((i) => isComplete(i as LibraryItemShape).ok), destination as Destination).map(serialize)
    : rows;

  return NextResponse.json({
    items: usable,
    total: rows.length,
    canManage: MANAGE_ROLES.includes(user.role),
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const kind = String(b?.kind ?? '');
  if (!KINDS.has(kind)) return NextResponse.json({ error: 'Choose what kind of content this is.' }, { status: 400 });

  const title = (typeof b?.title === 'string' ? b.title : '').trim();
  if (!title) return NextResponse.json({ error: 'Give it a name your team will recognise.' }, { status: 400 });

  const scope = b?.scope === 'personal' ? 'personal' : 'workspace';
  // Publishing to the whole team is a lead's call, same as a quick reply.
  if (scope === 'workspace' && !MANAGE_ROLES.includes(user.role)) {
    return NextResponse.json(
      { error: 'Only an owner, admin or manager can add to the shared library. Save it as personal instead.' },
      { status: 403 },
    );
  }

  const shape: LibraryItemShape = {
    kind,
    body: typeof b?.body === 'string' ? b.body : null,
    fileId: typeof b?.fileId === 'string' && b.fileId ? b.fileId : null,
    linkUrl: typeof b?.linkUrl === 'string' && b.linkUrl ? b.linkUrl.trim() : null,
    templateId: typeof b?.templateId === 'string' && b.templateId ? b.templateId : null,
    catalogueItemIds: Array.isArray(b?.catalogueItemIds) ? b.catalogueItemIds.map(String).filter(Boolean) : [],
  };

  const complete = isComplete(shape);
  if (!complete.ok) return NextResponse.json({ error: complete.reason }, { status: 400 });

  const created = await prisma.crmLibraryItem.create({
    data: {
      tenantId: user.tenantId,
      kind,
      title,
      body: shape.body?.trim() || null,
      fileId: shape.fileId,
      linkUrl: shape.linkUrl,
      templateId: shape.templateId,
      catalogueItemIds: shape.catalogueItemIds ?? [],
      audience: AUDIENCES.has(String(b?.audience)) ? String(b!.audience) : 'general',
      tags: Array.isArray(b?.tags) ? b.tags.map((t) => String(t).toLowerCase().trim()).filter(Boolean).slice(0, 20) : [],
      language: (typeof b?.language === 'string' && b.language) || 'en',
      isOwnerContent: b?.isOwnerContent === true,
      scope,
      ownerId: scope === 'personal' ? user.id : null,
      createdByUserId: user.id,
    },
  });

  await audit({
    tenantId: user.tenantId, actorId: user.id, action: 'crm.library.created',
    targetType: 'library_item', targetId: created.id, detail: `${kind}: ${title}`,
  });

  return NextResponse.json({ item: serialize(created) }, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = typeof b?.id === 'string' ? b.id : '';
  if (!id) return NextResponse.json({ error: 'An item id is required.' }, { status: 400 });

  const existing = await prisma.crmLibraryItem.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const mine = existing.ownerId === user.id;
  if (!mine && !MANAGE_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Only an owner, admin or manager can change shared content.' }, { status: 403 });
  }

  // `used` is a counter bump from a composer, not an edit — kept separate so
  // recording a use never needs edit permission.
  if (b?.used === true) {
    const bumped = await prisma.crmLibraryItem.update({
      where: { id },
      data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
    });
    return NextResponse.json({ item: serialize(bumped) });
  }

  const data: Record<string, unknown> = {};
  if (typeof b?.title === 'string' && b.title.trim()) data.title = b.title.trim();
  if ('body' in b!) data.body = (typeof b.body === 'string' ? b.body.trim() : '') || null;
  if ('linkUrl' in b!) data.linkUrl = (typeof b.linkUrl === 'string' ? b.linkUrl.trim() : '') || null;
  if ('fileId' in b!) data.fileId = (typeof b.fileId === 'string' && b.fileId) || null;
  if ('templateId' in b!) data.templateId = (typeof b.templateId === 'string' && b.templateId) || null;
  if (Array.isArray(b?.catalogueItemIds)) data.catalogueItemIds = b.catalogueItemIds.map(String).filter(Boolean);
  if (AUDIENCES.has(String(b?.audience))) data.audience = String(b!.audience);
  if (Array.isArray(b?.tags)) data.tags = b.tags.map((t) => String(t).toLowerCase().trim()).filter(Boolean).slice(0, 20);
  if (typeof b?.isOwnerContent === 'boolean') data.isOwnerContent = b.isOwnerContent;
  if (typeof b?.active === 'boolean') data.active = b.active;

  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });

  // Re-check completeness against the merged shape, so an edit cannot leave an
  // item that looks fine in the list and fails when an agent picks it.
  const merged: LibraryItemShape = {
    kind: existing.kind,
    body: (data.body as string | null) ?? existing.body,
    fileId: (data.fileId as string | null) ?? existing.fileId,
    linkUrl: (data.linkUrl as string | null) ?? existing.linkUrl,
    templateId: (data.templateId as string | null) ?? existing.templateId,
    catalogueItemIds: (data.catalogueItemIds as string[]) ?? existing.catalogueItemIds,
  };
  const complete = isComplete(merged);
  if (!complete.ok && data.active !== false) {
    return NextResponse.json({ error: complete.reason }, { status: 400 });
  }

  const updated = await prisma.crmLibraryItem.update({ where: { id }, data });
  return NextResponse.json({ item: serialize(updated) });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id') ?? '';
  const existing = await prisma.crmLibraryItem.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  if (existing.ownerId !== user.id && !MANAGE_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Only an owner, admin or manager can remove shared content.' }, { status: 403 });
  }

  // Retired, not deleted: a campaign sent last month should still be
  // explicable, and that needs the item it sent to still exist.
  const retired = await prisma.crmLibraryItem.update({ where: { id }, data: { active: false } });
  await audit({
    tenantId: user.tenantId, actorId: user.id, action: 'crm.library.retired',
    targetType: 'library_item', targetId: id, detail: existing.title,
  });
  return NextResponse.json({ item: serialize(retired) });
}
