import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';

/**
 * Per-conversation flags an agent toggles: favourite, blocked, spam.
 *
 * Body: { favourite?: boolean, blocked?: boolean, spam?: boolean }
 *
 * Favourite is stored per user, because in a shared inbox "my favourites" is a
 * personal shortlist and one agent starring a thread should not pin it to
 * everybody else's list.
 *
 * Blocked and spam are deliberately separate, and both are shared. Spam is a
 * judgement about the content; blocked is a decision about the person. Folding
 * them together would make "show me spam" and "show me who we refuse to deal
 * with" the same question, and they are not.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;

  const convo = await prisma.conversation.findFirst({
    where: { id, tenantId: user.tenantId },
    select: { id: true, contactPhone: true, isBlocked: true, isSpam: true },
  });
  if (!convo) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });

  const b = (await req.json().catch(() => null)) as
    { favourite?: boolean; blocked?: boolean; spam?: boolean } | null;
  if (!b) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });

  if (typeof b.favourite === 'boolean') {
    if (b.favourite) {
      await prisma.conversationFavourite.upsert({
        where: { conversationId_userId: { conversationId: id, userId: user.id } },
        create: { tenantId: user.tenantId, conversationId: id, userId: user.id },
        update: {},
      });
    } else {
      await prisma.conversationFavourite.deleteMany({
        where: { conversationId: id, userId: user.id },
      });
    }
  }

  // Blocking and marking spam change what the whole team sees, so they are
  // restricted the same way reassignment is.
  const privileged = typeof b.blocked === 'boolean' || typeof b.spam === 'boolean';
  if (privileged && !['owner', 'admin', 'manager'].includes(user.role)) {
    return NextResponse.json(
      { error: 'Your role cannot block or mark conversations as spam.' },
      { status: 403 },
    );
  }

  if (privileged) {
    await prisma.conversation.update({
      where: { id },
      data: {
        ...(typeof b.blocked === 'boolean' ? { isBlocked: b.blocked } : {}),
        ...(typeof b.spam === 'boolean' ? { isSpam: b.spam } : {}),
      },
    });
    await audit({
      tenantId: user.tenantId,
      actorId: user.id,
      action: typeof b.blocked === 'boolean' ? 'conversation.blocked' : 'conversation.spam',
      targetType: 'conversation',
      targetId: id,
      detail: [
        typeof b.blocked === 'boolean' ? `blocked=${b.blocked}` : null,
        typeof b.spam === 'boolean' ? `spam=${b.spam}` : null,
        `+${convo.contactPhone}`,
      ].filter(Boolean).join(' '),
    });
  }

  return NextResponse.json({ ok: true });
}
