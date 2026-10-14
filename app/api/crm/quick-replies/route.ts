import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';
import {
  normaliseShortcut, validateQuickReply, DEFAULT_CATEGORIES, PLACEHOLDERS,
  SHORTCUT_MAX, WHATSAPP_TEXT_LIMIT,
} from '@/lib/crm/quick-replies';

/**
 * Quick replies for the whole workspace.
 *
 * Visibility: workspace-scoped replies belong to everyone; `personal` ones only
 * to their owner. That is the one scope rule here — a canned reply is not
 * customer data, so it is not row-scoped like contacts.
 */

function serialize(q: {
  id: string; shortcut: string; title: string; body: string; category: string;
  language: string; scope: string; ownerId: string | null; usageCount: number;
  lastUsedAt: Date | null; updatedAt: Date;
}) {
  return {
    id: q.id,
    shortcut: q.shortcut,
    title: q.title,
    body: q.body,
    category: q.category,
    language: q.language,
    scope: q.scope,
    ownerId: q.ownerId,
    usageCount: q.usageCount,
    lastUsedAt: q.lastUsedAt?.toISOString() ?? null,
    updatedAt: q.updatedAt.toISOString(),
  };
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const q = (new URL(req.url).searchParams.get('q') || '').trim();
  const rows = await prisma.crmQuickReply.findMany({
    where: {
      tenantId: user.tenantId,
      // Everyone's workspace replies, plus the caller's own personal ones.
      OR: [{ scope: 'workspace' }, { scope: 'personal', ownerId: user.id }],
      ...(q
        ? {
            AND: [{
              OR: [
                { shortcut: { contains: q, mode: 'insensitive' as const } },
                { title: { contains: q, mode: 'insensitive' as const } },
                { body: { contains: q, mode: 'insensitive' as const } },
              ],
            }],
          }
        : {}),
    },
    // Most-used first: the list is a working tool, not an archive.
    orderBy: [{ usageCount: 'desc' }, { title: 'asc' }],
    take: 300,
  });

  return NextResponse.json({
    quickReplies: rows.map(serialize),
    categories: [...new Set([...DEFAULT_CATEGORIES, ...rows.map((r) => r.category)])],
    placeholders: PLACEHOLDERS,
    limits: { shortcutMax: SHORTCUT_MAX, bodyMax: WHATSAPP_TEXT_LIMIT },
  });
}

/** Create a quick reply. Any signed-in user may add one. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const shortcut = normaliseShortcut(str(b.shortcut) || str(b.title));
  const title = str(b.title);
  const body = str(b.body);

  const issues = validateQuickReply({ shortcut, title, body });
  if (issues.length) return NextResponse.json({ error: issues[0].message, issues }, { status: 400 });

  // Only owner/admin/manager may publish to the whole workspace; everyone else
  // gets a personal one, so a new agent cannot quietly change what the team sends.
  const wantsWorkspace = b.scope !== 'personal';
  const canPublish = ['owner', 'admin', 'manager'].includes(user.role);
  const scope = wantsWorkspace && canPublish ? 'workspace' : 'personal';

  const clash = await prisma.crmQuickReply.findFirst({
    where: { tenantId: user.tenantId, shortcut },
    select: { id: true, title: true },
  });
  if (clash) {
    return NextResponse.json(
      { error: `/${shortcut} is already used by "${clash.title}". Pick another shortcut.` },
      { status: 409 },
    );
  }

  const created = await prisma.crmQuickReply.create({
    data: {
      tenantId: user.tenantId,
      shortcut,
      title,
      body,
      category: str(b.category) || 'General',
      language: str(b.language) || 'en',
      scope,
      ownerId: scope === 'personal' ? user.id : null,
      createdByUserId: user.id,
    },
  });
  await audit({
    tenantId: user.tenantId, actorId: user.id, action: 'quickReply.created',
    targetType: 'quickReply', targetId: created.id, detail: `/${shortcut} (${scope})`,
  });
  return NextResponse.json(serialize(created), { status: 201 });
}
