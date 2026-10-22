import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

/**
 * What somebody reports happening in an external group (PRD §9.2).
 *
 * Log Group Update / Add Note / Record Order Discussion / Record Outcome /
 * Attach File — the CRM actions the PRD lists for a group we cannot read.
 *
 * These are statements by a person, not messages from WhatsApp. They never
 * produce unread counts or response-time metrics, because the group's actual
 * traffic is invisible to us and inventing a number from these entries would
 * be worse than having none.
 */

const KINDS = new Set(['update', 'note', 'order_discussion', 'outcome', 'file']);

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const groupId = new URL(req.url).searchParams.get('groupId') ?? '';
  if (!groupId) return NextResponse.json({ error: 'A group id is required.' }, { status: 400 });

  const group = await prisma.crmExternalGroup.findFirst({
    where: { id: groupId, tenantId: user.tenantId }, select: { id: true },
  });
  if (!group) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const [logs, users] = await Promise.all([
    prisma.crmExternalGroupLog.findMany({
      where: { tenantId: user.tenantId, groupId },
      orderBy: { at: 'desc' },
      take: 200,
    }),
    prisma.user.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true } }),
  ]);
  const byId = new Map(users.map((u) => [u.id, u.name]));

  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      kind: l.kind,
      text: l.text,
      fileId: l.fileId,
      by: l.byUserId ? byId.get(l.byUserId) ?? 'Former member' : null,
      at: l.at.toISOString(),
    })),
    coverage: 'manual_external',
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const b = (await req.json().catch(() => null)) as {
    groupId?: string; kind?: string; text?: string; fileId?: string;
  } | null;
  const groupId = b?.groupId ?? '';
  if (!groupId) return NextResponse.json({ error: 'A group id is required.' }, { status: 400 });

  const group = await prisma.crmExternalGroup.findFirst({
    where: { id: groupId, tenantId: user.tenantId }, select: { id: true },
  });
  if (!group) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const kind = KINDS.has(String(b?.kind)) ? String(b!.kind) : 'update';
  const text = (b?.text ?? '').trim();
  if (!text && !b?.fileId) {
    return NextResponse.json({ error: 'Write what happened, or attach a file.' }, { status: 400 });
  }

  const created = await prisma.crmExternalGroupLog.create({
    data: {
      tenantId: user.tenantId, groupId, kind,
      text: text || null,
      fileId: b?.fileId ?? null,
      byUserId: user.id,
    },
  });

  // Somebody has just told us something current about this group, which is the
  // only way its freshness can ever move.
  await prisma.crmExternalGroup.update({
    where: { id: groupId },
    data: { lastManualUpdateAt: created.at },
  });

  return NextResponse.json({
    log: {
      id: created.id, kind: created.kind, text: created.text,
      fileId: created.fileId, by: user.name, at: created.at.toISOString(),
    },
  }, { status: 201 });
}
